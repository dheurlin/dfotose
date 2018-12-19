import mongoose from 'mongoose';
import galleryEntry from './gallery-entry'

const Schema = mongoose.Schema;

const imageSchema = galleryEntry({
  filename: {type: String, required: true, unique: true},

  thumbnail: {type: String},
  preview: {type:String},
  fullSize: {type: String},

  exifData: Schema.Types.Mixed,
})

const Image = mongoose.model('Image', imageSchema);
export default Image;
