import _ from 'lodash';

import moment from 'moment';
import axios from 'axios';
import {computed, action,observable} from 'mobx';

import UiState from './UiState';

class Gallery {
  @observable data;

  constructor(galleryData) {
    this.data = galleryData;
  }

  @computed get id() {
    return this.data._id;
  }

  @computed get name() {
    return this.data.name;
  }

  @computed get description() {
    return this.data.description;
  }

  @computed get published() {
    return this.data.published;
  }

  @computed get shootDate() {
    return this.data.shootDate;
  }

  @computed get thumbnailPreview() {
    return `/v1/gallery/${this.data._id}/thumbnail-preview`;
  }

  @action update(data) {
    _.assign(this.data, data);
    return this.save();
  }

  @action publish() {
    return axios.post(`/v1/gallery/${this.id}/publish`, {})
      .then((() => {
        this.data.published = true;
      }).bind(this));
  }

  @action unpublish() {
    return axios.post(`/v1/gallery/${this.id}/unpublish`, {})
      .then((() => {
        this.data.published = true;
      }).bind(this));
  }

  @action save() {
    return axios.put(`/v1/gallery/${this.id}`, this.data, { responseType: 'json' });
  }

  @action remove() {
    return axios.delete(`/v1/gallery/${this.id}`);
  }
}

class GalleryStore {
  @observable galleries = [];

  // Max 4 in a row - 28/4 = 8 rows
  PAGE_SIZE = 28;
  @observable currentPageNumber = 1;
  @observable maxPageNumber = 1;

  loadAll = false;

  constructor(loadAll) {
    this.loadAll = loadAll;
    this.reload();
  }

  loadGalleriesWithUrl(url) {
    return axios.get(url).then((response => {
      this.loadGalleries(response.data);
    }).bind(this));
  }

  @action loadGalleries(galleryDatas) {
    this.galleries = _.map(galleryDatas, data => {
      return new Gallery(data);
    })
  }

  @action reload() {
    axios.get('/v1/gallery/count').then((response => {
      this.maxPageNumber = Math.ceil(response.data.count / this.PAGE_SIZE);
    }).bind(this));

    if (this.loadAll) {
      return this.loadGalleriesWithUrl('/v1/gallery/all');
    } else {
      return this.loadGalleriesWithUrl(`/v1/gallery/limit/${this.PAGE_SIZE}`);
    }
  }

  @action addGallery(name, description, date) {
    return axios.post('/v1/gallery', { name: name, description: description, shootDate: date }, { responseType: 'json' })
      .then((response => {
        const newGallery = new Gallery(response.data);
        this.galleries.push(newGallery);
      }).bind(this));
  }

  @action removeGallery(galleryId) {
    const gallery = _.find(this.galleries, gallery => gallery.id == galleryId);
    return gallery.remove().then(() => {
      this.reload();
    })
  }

  @computed get Galleries() {
    return this.galleries;
  }

  static fetchGallery(galleryId) {
    return axios.get(`/v1/gallery/${galleryId}`)
      .then((response) => {
        const gallery = new Gallery(response.data);
        return Promise.resolve(gallery);
      });
  }

  static fetchAllGalleries() {
    return axios.get('/v1/gallery')
      .then((response) => {
        const galleries = _.map(response.data, data => new Gallery(data));
        return Promise.resolve(galleries);
      });
  }
}

export default GalleryStore;
