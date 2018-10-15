import _ from 'lodash';
import React from 'react';
import {Link, withRouter} from 'react-router-dom';
import moment from 'moment';

import GalleryImagesView from './GalleryImagesView';

import GalleryStore from '../../GalleryStore';
import ImageStore, {ImageGalleryList} from '../../ImageStore';
import UserStore from '../../UserStore';
import PreloadContainerFactory from '../PreloadContainerFactory';

class EditGalleryView extends React.Component {
  constructor(props) {
    super(props);

    const gallery = this.props.gallery;
    const date = moment(gallery.shootDate).format("YYYY-MM-DD");
    this.state = {
      name: gallery.name,
      description: gallery.description,
      published: gallery.published,
      date: date
    };
  }

  onChangeName(event) {
    this.setState({ name: event.target.value });
  }

  onChangeDescription(event) {
    this.setState({ description: event.target.value });
  }

  onChangeDate(event) {
    this.setState({ date: event.target.value });
  }

  onSave(event) {
    event.preventDefault();

    const newGalleryData = {
      name: this.state.name,
      description: this.state.description,
      shootDate: this.state.date
    };

    this.props.gallery.update(newGalleryData)
      .then(() => {
        this.props.history.push('/admin/gallery');
      });
  }

  onPublishToggle(event) {
    event.preventDefault();

    const isPublished = this.props.gallery.published;
    if (isPublished) {
      if (!confirm('Vill du verkligen ta bort den som publikt album?')) {
        return;
      }

      this.props.gallery.unpublish().then((() => {
        this.setState({ published: false });
      }).bind(this));
    } else {
      this.props.gallery.publish().then((() => {
        this.setState({ published: true });
      }).bind(this));
    }
  }

  render() {
    const isPublished = this.state.published;

    return (
      <div>
        <form onSubmit={ this.onSave.bind(this) }>
          <h4> Ändrar galleri: { this.props.gallery.id } </h4>
          <label>Namn på galleri:</label>
          <input className="u-full-width" type="text" value={ this.state.name } onChange={ this.onChangeName.bind(this) } placeholder="namn" />
          <label>Beskrivning utav gallery:</label>
          <textarea className="u-full-width" value={ this.state.description } onChange={ this.onChangeDescription.bind(this) }/>
          <label>Datum för galleri:</label>
          <input className="u-full-width" type="date" value={ this.state.date } onChange={ this.onChangeDate.bind(this) } placeholder="yyyy-mm-dd" />
          <button type="submit" className="button-primary">Spara</button>
          <Link to="/admin/gallery">Tillbaka</Link>

          <br/>
          { !isPublished ?
            <button type="button" className="button-primary" onClick={ this.onPublishToggle.bind(this) }>
              Publicera </button>
            :
            <button type="button" className="button-primary" onClick={ this.onPublishToggle.bind(this) }>
              O-Publicera </button>
          }
        </form>
        <hr/>
        <GalleryImagesView galleryId={ this.props.gallery.id } imageList={ this.props.imageList } userList={ this.props.users } />
      </div>
    );
  }
}

const EditGalleryViewContainer = PreloadContainerFactory((props) => {
  const galleryId = _.get(props, 'match.params.id');

  const galleryPromise = GalleryStore.fetchGallery(galleryId);
  const imagesPromise = ImageStore.fetchImagesInGallery(galleryId);
  const userPromise = UserStore.fetchAllUsers();

  return Promise.all([galleryPromise, imagesPromise, userPromise]).then(([gallery, images, users]) => {
    return {
      gallery: gallery,
      galleryId: galleryId,
      users: users,
      imageList: new ImageGalleryList(galleryId, images)
    };
  });
}, EditGalleryView);

export default withRouter(EditGalleryViewContainer);
