import _ from 'lodash';
import axios from 'axios';
import {computed,action,observable} from 'mobx';

import {GalleryEntry, EntryGalleryList, EntriesForTagList, GalleryEntryStore} from './GalleryEntryStore';

export class Image extends GalleryEntry {

  static get apiPrefix() { return 'image'; }

  @computed get filename() {
    return this.data.filename;
  }

  @computed get thumbnail() {
    return `/v1/image/${this.data._id}/thumbnail`;
  }

  @computed get fullSize() {
    return `/v1/image/${this.data._id}/fullSize`;
  }

  @computed get preview() {
    return `/v1/image/${this.data._id}/preview`;
  }

}

export class ImageGalleryList extends EntryGalleryList {

  @computed get images() { return this.entries; }

  static get EntryClass() { return Image; }

  @action addImages(formData, progressCallback) {
    const config = {
      onUploadProgress: (event => {
        const decimalPercentage = event.loaded / event.total;
        const percent = Math.round(decimalPercentage * 10000) / 100;
        progressCallback(percent);
      })
    };

    return axios.post(`/v1/image/${this.galleryId}`, formData, config)
      .then((() => {
        this.fetchImages();
      }).bind(this));
  }

  fetchImages() { return this.fetchEntries(); }

  @action removeMarkedImages() {
    return this.removeMarkedEntries();
  }

}

export class ImagesForTagList extends EntriesForTagList {

  @computed get images() { return this.entries; }

  static get EntryClass() { return Image; }

  fetchImages() { return this.fetchEntries; }

}

export class ImageStore extends GalleryEntryStore {

  static get TagListClass() { return ImagesForTagList; }

  getImagesForTag(tag) { return this.getEntriesForTag(tag); }

  static fetchImagesInGallery(galleryId) { return this.fetchEntriesInGallery(galleryId); }

}

export default ImageStore;
