import _ from 'lodash';
import {Router} from 'express';
import bodyParser from 'body-parser';

import UserEligibleForRole, {Restrictions} from '../model/user-roles';
import {requireRestrictions} from './auth-api';

import Logger from '../logger';
import {abortOnError} from '../utils';

const router = Router();
export default router;

const jsonParser = bodyParser.json();

// Fetch all users that are eligible to be elevated
// upon first login
router.get('/eligible',
  requireRestrictions(Restrictions.READ_USERS),
  (req, res) => {
    UserEligibleForRole.find({}, (err, eligibleUsers) => {
      abortOnError(err, res);
      res.send(eligibleUsers);
    });
});

// Sets a user to be elevated to a specific role
// upon first login
router.post('/eligible',
  requireRestrictions(Restrictions.WRITE_USERS),
  jsonParser,
  (req, res) => {
    const {cid, role} = req.body;

    UserEligibleForRole.findOne({cid: cid}, (err, user) => {
      abortOnError(err, res);
      if (user) {
        res.status(500).send(`${cid} already has one added ..`);
        return;
      }

      UserEligibleForRole({
        cid: cid, role: role
      }).save(err => {
        abortOnError(err, res);

        Logger.info(`${req.session.user.cid} set ${cid} to be elevated to role ${role} upon first login`);
        res.send({ cid: cid, role: role });
      });
    });
});

// Remove a user from getting elevated to a specific role
// when logging in the first time.
router.delete('/eligible/:cid',
  requireRestrictions(Restrictions.WRITE_USERS),
  (req, res) => {
    const cid = req.params.cid;

    UserEligibleForRole.find({cid: cid}).remove(err => {
      abortOnError(err, res);
      res.status(202).end();
    });
});

// Used by auth-api to determine the initial role when a user
// logs in the first time
export function fetchInitialRole(cid, cb) {
  UserEligibleForRole.findOne({
    cid: cid
  }, (err, eligibleUser) => {
    if (err) throw err;
    const role = _.get(eligibleUser, 'role', 'None');
    cb(role);
  });
}

// Used by auth-api
export function removeElevatedIfExists(cid) {
  UserEligibleForRole.find({cid: cid}).remove(err => {
  });
}
