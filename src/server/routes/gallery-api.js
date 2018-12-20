import _ from 'lodash';
import {Router} from 'express';
import bodyParser from 'body-parser';

import {Restrictions} from '../model/user-roles';
import {requireRestrictions} from './auth-api.js';
import Logger from '../logger';
import {abortOnError} from '../utils';

import Gallery from '../model/gallery';
import Image from '../model/image';

const jsonParser = bodyParser.json();

const router = Router();
export default router;

// Return all published galleries
router.get('/', (req, res) => {
  Gallery.find({ published: true }).sort('-shootDate -created_at').exec((err, galleries) => {
    abortOnError(err, res);
    res.send(galleries);
  });
});

// Return all published galleries with a limit
router.get('/limit/:limit', (req, res) => {
  const limit = _.get(req.params, 'limit', 28);
  const nLimit = Number(limit);

  Gallery.find({ published: true }).sort('-shootDate').limit(nLimit).exec((err, galleries) => {
    abortOnError(err, res);
    res.send(galleries);
  });
});

// Return _all_ galleries, even unpublished
router.get('/all',
  // WRITE_IMAGES -> then you can add to unpublished galleries and read these
  requireRestrictions(Restrictions.WRITE_IMAGES),
  (req, res) => {
  Gallery.find({}).sort('-shootDate').exec((err, galleries) => {
    abortOnError(err, res);
    res.send(galleries);
  });
});

// Return all galleries (only published) _after_ a certain date
// this to enable pagination in the frontend.
router.get('/after/:startDate/limit/:limit', (req, res) => {
  const {startDate, limit} = req.params;
  const nLimit = Number(limit);

  Gallery.find({ published: true, shootDate: { $lt: startDate }})
    .sort('-shootDate')
    .limit(nLimit)
    .exec((err, galleries) => {
      abortOnError(err, res);
      res.send(galleries);
    });
});

// Return all galleries (only published) _before_ a certain date
// this to enable pagination in the frontend.
router.get('/before/:startDate/limit/:limit', (req, res) => {
  const {startDate, limit} = req.params;
  const nLimit = Number(limit);

  Gallery.find({ published: true, shootDate: { $gt: startDate }})
    .sort('shootDate')
    .limit(nLimit)
    .exec((err, galleries) => {
      abortOnError(err, res);
      res.send(galleries);
    });
});

// Return the count of all galleries
router.get('/count', (req, res) => {
  Gallery.count({ published: true }, (err, count) => {
    abortOnError(err, res);
    res.send({ count: count });
  });
});

// Return a specific gallery
router.get('/:id', (req, res) => {
  const id = req.params.id;

  Gallery.findById(id, (err, gallery) => {
    abortOnError(err, res);
    res.send(gallery);
  });
});

// Return the thumbnail preview for this particular
// gallery
router.get('/:id/thumbnail-preview', (req, res) => {
  const id = req.params.id;

  // Tries to get one image with the given query. If none is found, do the failFun
  const sendOneOrFail = (query, failFun) => {
    Image.findOne(query, (err, image) => {
      abortOnError(err, res);

      if (image !== null) {
        res.sendFile(image.thumbnail)
      } else {
        failFun();
      }
    });
  }

  // Try to get a thumbnail image, else get any image, else return an error
  sendOneOrFail({galleryId: id, isGalleryThumbnail: true},
      () => sendOneOrFail({galleryId: id}, res.status(200).end)
  );

});

// Create an entirely new gallery
//    - Possibly associate with an event or
//      to restrict it to one gallery per event.
router.post('/',
  requireRestrictions(Restrictions.WRITE_GALLERY),
  jsonParser, (req, res) => {
  const galleryData = req.body;

  let newGallery = Gallery(galleryData);
  newGallery.save((err) => {
    abortOnError(err, res);

    Logger.info(`New gallery with name ${newGallery.name} created`);

    res.send(newGallery);
  })
});

// Modify an existing gallery
//  - Should not be able to modify authors
//      as they should be set automatically and
//      removed automatically.
router.put('/:id',
  requireRestrictions(Restrictions.WRITE_GALLERY),
  jsonParser, (req, res) => {
  const galleryData = req.body;
  const id = req.params.id;

  Gallery.findOneAndUpdate({ _id: id }, {
    $set: {
      name: galleryData.name,
      description: galleryData.description,
      shootDate: galleryData.shootDate
    }
  }, (err) => {
    abortOnError(err, res);

    res.status(202).end();
  });
});

// Publish a gallery
router.post('/:id/publish',
  requireRestrictions(Restrictions.PUBLISH_GALLERY),
  (req, res) => {
  const id = req.params.id;

  Gallery.findOneAndUpdate({_id: id}, {
    $set: {
      published: true
    }
  }, (err) => {
    abortOnError(err, res);

    res.status(202).end();
  });
});

// Unpublish a gallery
router.post('/:id/unpublish',
  requireRestrictions(Restrictions.PUBLISH_GALLERY),
  (req, res) => {
  const id = req.params.id;

  Gallery.findOneAndUpdate({_id: id}, {
    $set: {
      published: false
    }
  }, (err) => {
    abortOnError(err, res);

    res.status(202).end();
  });
});

// Remove an entire gallery
//  should not be used ever imho.
router.delete('/:id',
  requireRestrictions(Restrictions.WRITE_GALLERY),
  (req, res) => {
  const id = req.params.id;

  Gallery.remove({ _id: id }, (err) => {
    abortOnError(err);
    res.status(202).end();
  });
});
