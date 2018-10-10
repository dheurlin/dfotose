import _ from 'lodash';
import React from 'react';
import {withRouter} from 'react-router-dom';
import {observer} from 'mobx-react';
import moment from 'moment';
import {animateScroll} from 'react-scroll';

import ImageList from './ImageList';
import LoadingSpinner from './LoadingSpinner';

import GalleryStore from '../GalleryStore';
import ImageStore from '../ImageStore';
import UiState from '../UiState';
import PreloadContainerFactory from './PreloadContainerFactory';

@observer
@withRouter
class GalleryView extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showSpinner: true
    };
  }

  onAllImagesLoaded() {
    if (this.state.showSpinner) {
      this.setState({showSpinner: false});

      if (UiState.oldScrollPosition != 0 && UiState.lastGalleryIdViewed == this.props.gallery.id) {
        animateScroll.scrollTo(UiState.oldScrollPosition, {
          duration: 50,
          delay: 100,
          smooth: false
        });
      }
    }
  }

  onImageClick(image) {
    const imageViewLink = `/gallery/${image.galleryId}/image/${image.id}`;
    const top  = window.pageYOffset || document.documentElement.scrollTop;

    UiState.updateScrollPosition(top);
    UiState.updateLastGalleryIdViewed(image.galleryId);
    this.props.history.push(imageViewLink);
  }

  render() {
    const {gallery, images} = this.props;

    if (gallery == undefined) {
      return (<p>Galleriet finns inte</p>);
    }

    const showSpinner = this.state.showSpinner;
    const date = moment(gallery.shootDate).format("YYYY-MM-DD");

    return (
      <div className="gallery-view">
        <div className="title">
          <h2>{ gallery.name } - { date }</h2>
          <p>{ images.length } bilder.<br/>
             { gallery.description }</p>
        </div>
        <LoadingSpinner visible={ showSpinner } />
        <ImageList images={ images } onAllLoaded={ this.onAllImagesLoaded.bind(this) } onImageClick={ this.onImageClick.bind(this) } />
      </div>
    )
  }
}

const GalleryViewContainer = PreloadContainerFactory((props) => {
  const galleryId = _.get(props, 'match.params.id');

  const galleryPromise = GalleryStore.fetchGallery(galleryId);
  const imagesPromise = ImageStore.fetchImagesInGallery(galleryId);

  return Promise.all([galleryPromise, imagesPromise]).then(([gallery, images]) => {
    return {
      gallery: gallery,
      galleryId: galleryId,
      images: images
    };
  });
}, GalleryView);

export default withRouter(GalleryViewContainer);
