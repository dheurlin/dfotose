import {observable, action} from 'mobx';

import User from './User';
import GalleryStore from './GalleryStore';
import ImageStore from './ImageStore';

class UiState {
  @observable user = new User();
  @observable galleryStore = new GalleryStore();
  @observable imageStore = new ImageStore();
  
  @action refresh() {
    this.galleryStore = new GalleryStore();
  }
}

const state = new UiState;
export default state;