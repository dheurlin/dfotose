import _ from 'lodash';
import {Router} from 'express';
import bodyParser from 'body-parser';
import moment from 'moment';

import Video from '../model/video';
import {requireRestrictions} from './auth-api';
import {Restrictions} from '../model/user-roles';

import Logger from '../logger';
import {abortOnError} from '../utils';


const router = Router();
export default router;

const jsonParser = bodyParser.json();

// Add video to gallery
router.post('/video/:galleryId',
  requireRestrictions(Restrictions.WRITE_IMAGES), jsonParser, (req, res) => {

  const galleryId = req.params.galleryId;
  const {url} = req.body;
  const userCid = req.session.user.cid;

  const newVideo = new Video ({
    url: url,
    authorCid : userCid,
    author : _.get(req.session, 'user.fullname', ''),
    galleryId : galleryId,
    shotAt: moment(),
  });

  newVideo.save((err) => {
    if (err) {
      Logger.error(err);
      throw err;
    }

    Logger.info(`Saved video ${url}`);
  });

  res.status(202).send();

});
