import _ from 'lodash';
import React from 'react';
import {observer} from 'mobx-react';

import {Link} from 'react-router-dom';

import keydown, {Keys} from 'react-keydown';

import LoadingSpinner from './LoadingSpinner';

import uiState from '../UiState';

import GalleryStore from '../GalleryStore';
import ImageStore from '../ImageStore';
import PreloadContainerFactory from './PreloadContainerFactory';

import LoginRequired from '../LoginRequired';

@observer
class Image extends React.Component {
  render() {
    const image = this.props.image;

    return (
      <div className="image-container">
        <img onLoad={ this.props.onLoaded } onClick={this.props.onClick} className="primary-image" src={ image.preview } />
      </div>
    );
  }
}

@observer
class ImageView extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      initialImageId: props.imageId,
      imageId: props.imageId,
      newTag: ''
    };
    window.history.replaceState({ imageId: props.imageId }, null, `/gallery/${props.galleryId}/image/${props.imageId}`);

    window.onpopstate = (event => {
      const imageId = _.get(event, 'state.imageId', this.state.initialImageId);
      this.setState({ imageId: event.state.imageId });
    }).bind(this);
  }

  @keydown(Keys.right)
  openNextImage(event) {
    event.preventDefault();

    const images = this.props.images;
    const imageId = this.state.imageId;

    const index = _.findIndex(images, {id: imageId});
    const nextIndex = index + 1;
    const insideBounds = nextIndex < images.length && nextIndex >= 0;

    const nextId = insideBounds ? images[nextIndex].id : images[0].id;
    this.openImage(nextId);
  }

  @keydown(Keys.left)
  openPrevImage(event) {
    event.preventDefault();

    const images = this.props.images;
    const imageId = this.state.imageId;

    const index = _.findIndex(images, {id: imageId});
    const nextIndex = index - 1;
    const insideBounds = nextIndex < images.length && nextIndex >= 0;

    const nextId = insideBounds ? images[nextIndex].id : images[images.length - 1].id;
    this.openImage(nextId);
  }

  openImage(nextId) {
    window.history.pushState({ imageId: nextId }, null, `/gallery/${this.props.galleryId}/image/${nextId}`);
    this.setState({imageId: nextId, loaded: false});
  }

  onImageLoad(event) {
    this.setState({ loaded: true });
  }

  onChangeTag(event) {
    this.setState({newTag: event.target.value});
  }

  onAddTag(event) {
    event.preventDefault();

    const newTagName = this.state.newTag;
    const images = this.props.images;
    const imageId = this.state.imageId;
    const currentImage = _.find(images, image => image.id == imageId);

    currentImage.addTag(newTagName)
                .then(() => {
                });

    this.setState({newTag: ''});
  }

  render() {
    if (!uiState.user.isLoggedIn || uiState.user.role == 'None') {
      return (<LoginRequired />);
    }

    const images = this.props.images;
    const imageId = this.state.imageId;
    const currentImageIndex = _.findIndex(images, image => image.id == imageId);
    const currentImage = _.nth(images, currentImageIndex);

    if (images.length <= 0) {
      return (<LoadingSpinner visible={ true } />);
    }

    if (currentImage == undefined) {
      return (<LoadingSpinner visible={ true } />);
    }

    function clickFullSize(fullSize) {
      return (event) => {
        event.preventDefault();
        window.open(fullSize);
      };
    }

    return (
      <div className="image-view">
        <div className="image-with-buttons">

          <Image onLoaded={ this.onImageLoad.bind(this) } onClick={ this.openNextImage.bind(this) } image={ currentImage } />
          <div className="buttons">
            <a href="#" onClick={ this.openPrevImage.bind(this) }>Föregående</a>
            <div className="middle">
              <span>bild { currentImageIndex+1 } / { images.length } </span>
              <Link to={ "/gallery/" + this.props.galleryId }>Tillbaka till galleriet </Link>
            </div>
            <a href="#" onClick={ this.openNextImage.bind(this) }>Nästa</a>
          </div>

          { !this.state.loaded ?
            <div className="image-loading-spinner">
              <LoadingSpinner visible={ !this.state.loaded } />
            </div>
            : null }
        </div>

        <aside id="info">

            <div className="details">
                <span><b>Fotograf</b>: {currentImage.author}</span>
                <span><b>Bild-Id</b>: {currentImage.id}</span>
                <a href={ currentImage.fullSize } onClick={ clickFullSize(currentImage.fullSize) } target="_blank">Öppna bilden i full storlek</a>
            </div>


            <div className="tags"><span><b>Taggar</b>: {currentImage.tags.join(', ')}</span>
                <form onSubmit={ this.onAddTag.bind(this) } className="new-tag-form">
                    <input type="text" name="newTag" placeholder="ny tagg" value={ this.state.newTag } onChange={ this.onChangeTag.bind(this) } />
                    <button type="submit" className="button">Lägg till</button>
                </form>
            </div>

        </aside>

      </div>
    );
  }
}

const ImageContainer = PreloadContainerFactory((props) => {
  const galleryId = _.get(props, 'match.params.galleryId');
  const id = _.get(props, 'match.params.id');

  const galleryPromise = GalleryStore.fetchGallery(galleryId);
  const imagesPromise = ImageStore.fetchImagesInGallery(galleryId);

  return Promise.all([galleryPromise, imagesPromise]).then(([gallery, images]) => {
    return {
      gallery: gallery,
      galleryId: galleryId,
      imageId: id,
      images: images,
      ...props
    };
  });
}, ImageView);


export default ImageContainer;
