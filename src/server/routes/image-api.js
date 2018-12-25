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
import Gallery from '../model/gallery';

import galleryEntryRouter from './gallery-entry-api.js'

const router = galleryEntryRouter(Image);

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

// Return a specific image using an id
router.get('/:id/fullSize', (req, res) => {
  const id = req.params.id;

  Image.findById(id, (err, image) => {
    if (err) {
      res.status(500).send(err);
      throw err;
    }

    res.sendFile(image.fullSize);
  });
});

router.get('/:id/thumbnail', (req, res) => {
  const id = req.params.id;

  Image.findById(id, (err, image) => {
    if (err) {
      res.status(500).send(err);
      throw err;
    }

    res.sendFile(image.thumbnail);
  });
});

router.get('/:id/preview', (req, res) => {
  const id = req.params.id;

  Image.findById(id, (err, image) => {
    if (err) {
      res.status(500).send(err);
      throw err;
    }

    res.sendFile(image.preview);
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

      const preview = path.resolve(galleryPath, "previews", `${filename}.${extension}`);
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
router.post('/',
  requireRestrictions(Restrictions.WRITE_IMAGES | Restrictions.WRITE_GALLERY)
  , upload.array('photos'), (req, res) => {
  handleImages(req, res, 'undefined');
  res.status(202).send();
});

// Upload images to a specific gallery
//  - Author is always the logged-in User
//  - The images will be added to the gallery
//    automatically.
router.post('/:galleryId',
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

