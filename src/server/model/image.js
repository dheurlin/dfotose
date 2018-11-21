import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const imageSchema = new Schema({
  filename: {type: String, required: true, unique: true},

  authorCid: {type: String, required: true, index: true},
  author: {type: String, required: false},

  galleryId: {type: String},

  thumbnail: {type: String},
  preview: {type:String},
  fullSize: {type: String},

  isGalleryThumbnail: {type: Boolean, default: false},

  tags: [String],

  shotAt: {type: Date, default: Date.now},
  exifData: Schema.Types.Mixed,

  created_at: {type: Date, default: Date.now}
});

const Image = mongoose.model('Image', imageSchema);
export default Image;
