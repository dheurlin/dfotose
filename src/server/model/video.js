
import mongoose from 'mongoose';
import galleryEntry from './gallery-entry'

const Schema = mongoose.Schema;

const videoSchema = galleryEntry({
  url: {type: String, required: true, index: true},
})

const Video = mongoose.model('Video', videoSchema);
export default Video;
