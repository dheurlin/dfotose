import mongoose from 'mongoose';

const Schema = mongoose.Schema;


// A base class for entries in galleries (images, videos, anything else we might wanna add
const baseProps = {
  authorCid: {type: String, required: true, index: true},
  author: {type: String, required: false},

  galleryId: {type: String},

  isGalleryThumbnail: {type: Boolean, default: false},

  tags: [String],
  shotAt: {type: Date, default: Date.now},

  created_at: {type: Date, default: Date.now}
}

const galleryEntry = props => new Schema({...baseProps, ...props});

export default galleryEntry;

