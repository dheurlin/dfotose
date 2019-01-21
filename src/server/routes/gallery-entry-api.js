import _ from 'lodash';
import {Router} from 'express';
import bodyParser from 'body-parser';
import {inHTMLData} from 'xss-filters';
import mongoose from 'mongoose';
import moment from 'moment';

import Gallery from '../model/gallery';
import User from '../model/user';
import ImageTag from '../model/image-tag';
import {requireRestrictions, hasRestrictions} from './auth-api';
import {Restrictions} from '../model/user-roles';

import Logger from '../logger';
import {abortOnError} from '../utils';


// Returns a router prepopulated with the routes common to gallery entries,
// given the database model class to be used to write and read data
const galleryEntryRouter = className => {

  const jsonParser = bodyParser.json();
  const router = Router();

  // Return all entries for a specific gallery
  router.get('/:galleryId', (req, res) => {
    console.log('dags för kebab!');
    const galleryId = req.params.galleryId;

    className.find({galleryId: galleryId}).sort('shotAt').exec((err, entries) => {
      if (err) {
        res.status(500).send(err);
        throw err;
      }

      res.send(entries);
    });
  });

  router.get('/:id/details', (req,res) => {
    const id = req.params.id;
    className.findById(id, (err, entry) => {
      abortOnError(err, res);
      res.send(entry);
    });
  });


  router.get('/:id/tags', (req, res) => {
    const id = req.params.id;
    ImageTag.find({ imageId: id }, (err, imageTags) => {
      abortOnError(err, res);

      res.send(imageTags);
    });
  });

  router.get('/:id/author', (req, res) => {
      const id = req.params.id;
      className.findById(id, (err, entry) => {
          abortOnError(err, res);
          res.send(entry.author);
      });
  })

  router.post('/:id/gallerythumbnail', (req,res) => {
    const id = req.params.id;

    const canWriteImage = hasRestrictions(
        req,
        Restrictions.WRITE_GALLERY | Restrictions.WRITE_IMAGES
    );

    if (!canWriteImage) {
      res.status(403).end();
      Logger.warn(`User ${req.session.user.cid} had insufficient permissions to change thumbnail.`);
      return;
    }

    // Find the entry that should be set as thumbnail
    className.findOne({_id: id}, (err, newThumb) => {
      abortOnError(err, res);

      // Remove the entry that was previously thumbnail
      className.find({galleryId: newThumb.galleryId, isGalleryThumbnail: true}, (err, oldThumbs) => {
        if (oldThumbs !== null && oldThumbs.length !== 0) {
          oldThumbs.forEach(oldThumb => {
            oldThumb.isGalleryThumbnail = false;
            oldThumb.save();
          });
        }
        else { console.log("No old thumbnail found"); }
      });

      // Set the new one as thumbnail
      newThumb.isGalleryThumbnail = true;
      newThumb.save();
      console.log(`Changed gallery thumbnail to ${id} for gallery ${newThumb.galleryId}`);
      res.status(202).end();

    });
  })

  router.post('/:id/author', jsonParser, (req, res) => {
      const entryId = req.params.id;
      const {newCid} = req.body;

      const canWriteImage = hasRestrictions(
          req,
          Restrictions.WRITE_GALLERY | Restrictions.WRITE_IMAGES
      );

      if (!canWriteImage) {
        res.status(403).end();
        Logger.warn(`User ${req.session.user.cid} had insufficient permissions to change author`);
        return;
      }

      // First find the user so we can get the fullname
      User.findOne({cid: newCid}, (err, user) => {
          abortOnError(err, res);

          // Next, update the entry
          className.findOneAndUpdate({_id: entryId}, {
            $set: {
              authorCid: newCid,
              author: user.fullname
            }
          }, (err) => {
            abortOnError(err, res);

            console.log(`Changed author to ${user.fullname} for gallery entry ${entryId}`);
            res.status(202).end();
          })
      });
  });

  router.post('/:id/tags', jsonParser, (req, res) => {
    const imageId = req.params.id;

    const {tagName} = req.body;
    const filteredTagName = inHTMLData(tagName).toLowerCase();

    const imageTagData = {
      imageId: imageId,
      tagName: filteredTagName
    };

    var newTag = new ImageTag(imageTagData);
    newTag.save((err) => {
      abortOnError(err, res);

      // Now add a duplicate to the images list of tags
      className.findById(imageId, (err, image) => {
        abortOnError(err, res);

        image.tags.push(filteredTagName);
        const newImageTags = image.tags;

        className.findOneAndUpdate({ _id: imageId }, {
          $set: {
            tags: newImageTags
          }
        }, (err) => {
          abortOnError(err, res);

          console.log(`Added tag ${filteredTagName} to image ${imageId}`);
          res.status(202).end();
        });
      });
    });
  });

  router.get('/tags/:tagName/search', (req, res) => {
    const tagName = req.params.tagName.toLowerCase();

    ImageTag.find({ tagName: tagName }, (err, imageTags) => {
      abortOnError(err, res);

      // imageTags contains all of the ids of images we need to send
      // to the client
      const imageObjectIds = _.map(imageTags, tag => {
        return mongoose.Types.ObjectId(tag.imageId);
      });

      className.find({ '_id': {
        $in: imageObjectIds
      }}, (err, images) => {
        abortOnError(err, res);

        res.send(images);
      });
    });
  });


  router.delete('/:id',
    requireRestrictions(Restrictions.WRITE_IMAGES | Restrictions.WRITE_GALLERY),
    (req, res) => {
    const id = req.params.id;

    className.findByIdAndRemove(id, (err, image) => {
      if (err) {
        res.status(500).send(err);
        throw err;
      }

      Logger.info(`User ${req.session.user.cid} removed entry ${id}`);

      res.status(202).send();
    });
  });

  return router;

};


export default galleryEntryRouter;
