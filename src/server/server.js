import express from 'express'
import mongoose from 'mongoose'
import modRewrite from 'connect-modrewrite';
import helmet from 'helmet';

import morgan from 'morgan';

import session from 'express-session';
import connectRedis from 'connect-redis';

import Webpack from './webpack';

// Routes
import imageRouter from './routes/image-api';
import galleryRouter from './routes/gallery-api';
import authRouter from './routes/auth-api';
import userRoleRouter from './routes/user-role-api';

import config from './config';

mongoose.promise = global.Promise;

const connectWithRetry = () => {
  console.log('MongoDB connection with retry')
  mongoose.connect(`mongodb://${config.database.host}:27017/${config.database.name}`, { useNewUrlParser: true });
}

// Retry connection on failure
mongoose.connection.on('error', err => {
  console.log(`MongoDB connection error: ${err}`)
  setTimeout(connectWithRetry, 5000)
})

connectWithRetry();


const app = express();

const RedisStore = connectRedis(session);
const sessionMiddleware = session({
  store: new RedisStore({
    host: config.redis.host,
    port: 6379
  }),
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  name: 'dfotose.session'
});

if (process.env.NODE_ENV !== "production") {
  Webpack(app);
}

// Basic security module
app.use(helmet());

app.use(modRewrite([
  '^\/(?!(v1|auth|assets|favicon\.ico|robots\.txt|bundle.js)).*$ /index.html'
]));

app.use('/', express.static(__dirname + '/public'));

app.use(morgan('dev'));
app.use(sessionMiddleware);

// Include all routes
const baseUrl = '/v1';

app.use(authRouter);
app.use(baseUrl, imageRouter);
app.use(baseUrl, galleryRouter);
app.use(baseUrl, userRoleRouter);

app.listen(config.port, () => {
  console.log(`Listening :${config.port}`);
});
