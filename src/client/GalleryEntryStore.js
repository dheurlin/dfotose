import _ from 'lodash';
import axios from 'axios';
import {computed,action,observable} from 'mobx';

// This file contains abstract classes inherited by Images and Videos

export class GalleryEntry {
  @observable data;
  @observable marked = false;

  constructor(data) {
    this.data = data;
  }

  static get apiPrefix() { throw new Error("apiPrefix not implemented!"); }

  get prefix() { return this.constructor.apiPrefix; }

  @computed get id() {
    return this.data._id;
  }

  @computed get galleryId() {
    return this.data.galleryId;
  }

  @computed get author() {
    return _.get(this.data, 'author', this.data.authorCid);
  }

  @computed get authorCid() {
    return this.data.authorCid;
  }

  @computed get isGalleryThumbnail() {
    return _.get(this.data, 'isGalleryThumbnail', false);
  }

  @computed get tags() {
    return this.data.tags.toJS();
  }

  @computed get isMarked() {
    return this.marked;
  }

  @action mark() {
    this.marked = true;
  }

  @action unmark() {
    this.marked = false;
  }

  // Updates the whole .data of this entry
  @action updateData() {
    const entryId = this.data._id;
    return axios.get(`/v1/${this.prefix}/${entryId}/details`).then(response => {
      this.data = response.data;
    })
  }


  @action changeAuthor(newCid) {
    const entryId = this.data._id;
    return axios.post(`/v1/${this.prefix}/${entryId}/author`, {newCid: newCid}).then(() => {
        // Fetch the newly written parameters
        return axios.get(`/v1/${this.prefix}/${entryId}/author`).then(response => {
            console.log("New author: " + response.data);
            this.data.author = response.data;
        });
    });
  }

  @action setGalleryThumbnail() {
    const entryId = this.data._id;
    return axios.post(`/v1/${this.prefix}/${entryId}/gallerythumbnail`, {}).then((() => {
      this.data.isGalleryThumbnail = true;
    }).bind(this));
  }

  @action addTag(tagName) {
    const entryId = this.data._id;

    const imageTag = {
      imageId: entryId,
      tagName: tagName
    };

    return axios.post(`/v1/${this.prefix}/${entryId}/tags`, imageTag)
      .then((() => {
        this.data.tags.push(tagName);
      }).bind(this));
  }
}

export class EntryGalleryList {
  @observable entries = [];
  @observable galleryId = null;

  constructor(galleryId, entries) {
    this.galleryId = galleryId;
    this.entries    = entries;
  }

  static get EntryClass() { throw new Error('EntryClass not implemented!'); }

  get apiPrefix() { return this.constructor.EntryClass.apiPrefix; }

  fetchEntries() {
    return axios.get(`/v1/${this.apiPrefix}/${this.galleryId}`)
      .then((response => {
        this.entries = _.map(response.data, data => {
          return new this.constructor.EntryClass(data);
        });
      }).bind(this));
  }


  @action removeMarkedEntries() {
    const markedEntries = _.filter(this.entries, {isMarked: true});

    const removePromises = _.map(markedEntries, entry => {
      return axios.delete(`/v1/${this.apiPrefix}/${entry.id}`);
    });

    Promise.all(removePromises)
      .then(() => {
        this.entries = _.filter(this.entries, {isMarked: false});
      })
      .catch(err => {
        console.log(err);
        alert('Could not remove entries! ' + err);
      });
  }
}

export class EntriesForTagList {
  @observable entries = [];
  @observable tag = null;

  constructor(tag) {
    this.tag = tag;
    this.fetchEntries();
  }

  static get EntryClass() { throw new Error('EntryClass not implemented!'); }

  static get apiPrefix() { return this.EntryClass.apiPrefix; }

  fetchEntries() {
    axios.get(`/v1/${this.constructor.apiPrefix}/tags/${this.tag}/search`)
      .then((response => {
        this.entries = _.map(response.data, data => {
          return new this.constructor.EntryClass(data);
        });
      }).bind(this));
  }
}

export class GalleryEntryStore {

  static get TagListClass() { throw new Error('TagListClass not implemented!'); }

  static get EntryClass() { return this.TagListClass.EntryClass; }

  static get apiPrefix() { return this.EntryClass.apiPrefix; }

  getEntriesForTag(tag) {
    return new this.constructor.TagListClass(tag);
  }

  static fetchEntriesInGallery(galleryId) {
    return axios.get(`/v1/${this.apiPrefix}/${galleryId}`)
      .then((response => {
        const entries = _.map(response.data, data => {
          return new this.EntryClass(data);
        });

        return Promise.resolve(entries);
      }).bind(this));
  }
}

export default GalleryEntryStore;
