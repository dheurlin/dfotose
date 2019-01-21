import _ from 'lodash';
import uuid from 'uuid';
import {Router} from 'express';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';
import bodyParser from 'body-parser';
import {inHTMLData} from 'xss-filters';
import mongoose from 'mongoose';
import exifParser from 'exif-parser';
import moment from 'moment';

import {Restrictions} from '../model/user-roles';
import {requireRestrictions, hasRestrictions} from './auth-api.js';
import Logger from '../logger';
import config from '../config';
import {abortOnError} from '../utils';

const jsonParser = bodyParser.json();

import Image from '../model/image';
import ImageTag from '../model/image-tag';
import Gallery from '../model/gallery';
import User from '../model/user';

const router = Router();
export default router;

const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const path = config.storage.temporaryImagePath;
    cb(null, path);
  },
  filename: function (req, file, cb) {
    const filename = `${file.originalname}`;
    cb(null, filename);
  }
});

const upload = multer({ storage: imageStorage });

// Make sure storage directories are created
fs.mkdirs(config.storage.temporaryImagePath, (err) => {
  if (err) {
    Logger.error(`Could not create storage directory ${config.storage.temporaryImagePath}`);
    throw err;
  }
});
fs.mkdirs(config.storage.path, (err) => {
  if (err) {
    Logger.error(`Could not create storage directory ${config.storage.path}`);
    throw err;
  }
});

// Return all images for a specific gallery
router.get('/image/:galleryId', (req, res) => {
  const galleryId = req.params.galleryId;

  Image.find({galleryId: galleryId}).sort('shotAt').exec((err, images) => {
    if (err) {
      res.status(500).send(err);
      throw err;
    }

    res.send(images);
  });
});

router.get('/image/:id/details', (req,res) => {
  const id = req.params.id;
  Image.findById(id, (err, image) => {
    abortOnError(err, res);
    res.send(image);
  });
});

// Return a specific image using an id
router.get('/image/:id/fullSize', (req, res) => {
  const id = req.params.id;

  Image.findById(id, (err, image) => {
    if (err) {
      res.status(500).send(err);
      throw err;
    }

    res.sendFile(image.fullSize);
  });
});

router.get('/image/:id/thumbnail', (req, res) => {
  const id = req.params.id;

  Image.findById(id, (err, image) => {
    if (err) {
      res.status(500).send(err);
      throw err;
    }

    res.sendFile(image.thumbnail);
  });
});

router.get('/image/:id/preview', (req, res) => {
  const id = req.params.id;

  Image.findById(id, (err, image) => {
    if (err) {
      res.status(500).send(err);
      throw err;
    }

    res.sendFile(image.preview);
  });
});

router.get('/image/:id/tags', (req, res) => {
  const id = req.params.id;
  ImageTag.find({ imageId: id }, (err, imageTags) => {
    abortOnError(err, res);

    res.send(imageTags);
  });
});

router.get('/image/:id/author', (req, res) => {
    const id = req.params.id;
    Image.findById(id, (err, image) => {
        abortOnError(err, res);
        res.send(image.author);
    });
})

router.post('/image/:id/gallerythumbnail', (req,res) => {
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

  // Find the image that should be set as thumbnail
  Image.findOne({_id: id}, (err, newThumb) => {
    abortOnError(err, res);

    // Remove the image that was previously thumbnail
    Image.find({galleryId: newThumb.galleryId, isGalleryThumbnail: true}, (err, oldThumbs) => {
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

router.post('/image/:id/author', jsonParser, (req, res) => {
    const imageId = req.params.id;
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

        // Next, update the image
        Image.findOneAndUpdate({_id: imageId}, {
          $set: {
            authorCid: newCid,
            author: user.fullname
          }
        }, (err) => {
          abortOnError(err, res);

          console.log(`Changed author to ${user.fullname} for image ${imageId}`);
          res.status(202).end();
        })
    });
});

router.post('/image/:id/tags', jsonParser, (req, res) => {
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
    Image.findById(imageId, (err, image) => {
      abortOnError(err, res);

      image.tags.push(filteredTagName);
      const newImageTags = image.tags;

      Image.findOneAndUpdate({ _id: imageId }, {
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

router.get('/image/tags/:tagName/search', (req, res) => {
  const tagName = req.params.tagName.toLowerCase();

  ImageTag.find({ tagName: tagName }, (err, imageTags) => {
    abortOnError(err, res);

    // imageTags contains all of the ids of images we need to send
    // to the client
    const imageObjectIds = _.map(imageTags, tag => {
      return mongoose.Types.ObjectId(tag.imageId);
    });

    Image.find({ '_id': {
      $in: imageObjectIds
    }}, (err, images) => {
      abortOnError(err, res);

      res.send(images);
    });
  });
});

function createDirectoryIfNeeded(dir) {
  try {
    fs.statSync(dir);
  } catch(err) {
    fs.mkdirSync(dir);
  }
}

function readExifData(imagePath, cb) {
  fs.open(imagePath, 'r', (status, fd) => {
    if (status) {
      Logger.error(`Could not open ${imagePath} for reading`);
      return;
    }

    var buffer = new Buffer(65635); // 64kb buffer
    fs.read(fd, buffer, 0, 65635, 0, (err, bytesRead) => {
      if (err) {
        Logger.error(`Could not read EXIF data from ${imagePath}`);
        return;
      }

      try {
        var parser = exifParser.create(buffer);
        const parsed = parser.parse();
        cb(parsed);
      } catch(ex) {
        cb({});
      }
    });
  });
}

function handleImages(req, res, galleryId) {
  const userCid = req.session.user.cid;
  const images = req.files;

  _.forEach(images, (image) => {
    const fieldName = _.get(image, 'fieldname');
    if (fieldName !== 'photos') {
      res.status(500).send();
      throw "incorrect fieldName specified";
    }

    const extension = image.originalname.split('.').pop();
    const filename = uuid.v4();
    const galleryPath = path.resolve(config.storage.path, galleryId);
    const fullSizeImagePath = `${galleryPath}/${filename}.${extension}`;
    const isGif = extension === "gif";

    createDirectoryIfNeeded(galleryPath);
    createDirectoryIfNeeded(path.resolve(galleryPath, "thumbnails"));
    createDirectoryIfNeeded(path.resolve(galleryPath, "previews"));

    fs.move(image.path, fullSizeImagePath, (err) => {
      if (err) {
        Logger.error(err);
      }

      const thumbnail = path.resolve(galleryPath, "thumbnails", `${filename}.${extension}`);
      sharp(fullSizeImagePath)
        .resize(300, 200)
        .rotate() // rotates the image based on EXIF orientation data
        .crop(sharp.strategy.entropy)
        .toFile(thumbnail, (err) => {
          if (err) {
            Logger.error(`Could not save thumbnail for image ${filename}`);
          } else {
            Logger.info(`Saved thumbnail ${thumbnail}`);
          }
        });


      // If it's a gif, use the fullsize as preview to preserve animation
      const preview = isGif ? fullSizeImagePath : path.resolve(galleryPath, "previews", `${filename}.${extension}`);
      if (!isGif) {
        sharp(fullSizeImagePath)
          .resize(null, 800)
          .rotate() // rotates the image based on EXIF orientation data
          .toFile(preview, (err) => {
            if (err) {
              Logger.error(`Could not save preview for image ${filename}`);
            } else {
              Logger.info(`Saved preview ${preview}`);
            }
          });
      }

      readExifData(fullSizeImagePath, (exif) => {
        const shotAtUnformatted = _.get(exif, 'tags.DateTimeOriginal');
        const shotAt = shotAtUnformatted ? moment(shotAtUnformatted)
                                         : moment();

        var newImage = new Image({
          filename: filename,
          authorCid: userCid,
          galleryId: galleryId,
          thumbnail: thumbnail,
          preview: preview,
          fullSize: fullSizeImagePath,
          shotAt: shotAt,
          exifData: exif
        });

        if (_.has(req.session, 'user.fullname')) {
          newImage.author = _.get(req.session, 'user.fullname', '');
        }

        newImage.save((err) => {
          if (err) {
            Logger.error(err);
            throw err;
          }

          Logger.info(`Saved image ${filename}`);
        });
      });

    });
  });

  Logger.info(`${images.length} new images uploaded by ${req.session.user.cid}`);
}

// Upload images
//  - The images will not be attached to any
//    gallery when uploaded
router.post('/image',
  requireRestrictions(Restrictions.WRITE_IMAGES | Restrictions.WRITE_GALLERY)
  , upload.array('photos'), (req, res) => {
  handleImages(req, res, 'undefined');
  res.status(202).send();
});

// Upload images to a specific gallery
//  - Author is always the logged-in User
//  - The images will be added to the gallery
//    automatically.
router.post('/image/:galleryId',
  requireRestrictions(Restrictions.WRITE_IMAGES)
  , upload.array('photos'), (req, res) => {
  const galleryId = req.params.galleryId;

  // Validate the gallery
  Gallery.findById(galleryId, (err) => {
    if (err) {
      res.status(500).send(err);
      throw err;
    }

    Logger.info(`Preparing upload of files to gallery ${galleryId}`);
    handleImages(req, res, galleryId);
    res.status(202).send();
  });
});

// Updates the author retroactively on all images
// uploaded by a certain user
export function updateAuthorOfImagesUploadedByCid(cid, author) {
  const updated = { author: author };

  Image.find({ authorCid: cid }, (err, images) => {
    _.forEach(images, image => {
      Image.findOneAndUpdate(
        { _id: image._id },
        { $set : updated },
        (err, image) => {
          if (err) {
            throw err;
          }
        }
      );
    });
  });
}

// Delete a specific image
//  - Note: this automatically removes all gallery
//          associations.
router.delete('/image/:id',
  requireRestrictions(Restrictions.WRITE_IMAGES | Restrictions.WRITE_GALLERY),
  (req, res) => {
  const id = req.params.id;

  Image.findByIdAndRemove(id, (err, image) => {
    if (err) {
      res.status(500).send(err);
      throw err;
    }

    Logger.info(`User ${req.session.user.cid} removed image ${id}`);

    res.status(202).send();
  });
});
