import React from 'react';
import _ from 'lodash';
import {Link} from 'react-router-dom';
import {observer} from 'mobx-react';
import moment from 'moment';
import keydown, {Keys} from 'react-keydown';
import PropTypes from 'prop-types';

import PaginatedArray from '../PaginatedArray';
import PreloadContainerFactory from './PreloadContainerFactory';
import GalleryStore from '../GalleryStore';

@observer
class Gallery extends React.Component {
  render() {
    const gallery = this.props.gallery;

    const thumbnailPreview = gallery.thumbnailPreview;
    const galleryViewLink = `/gallery/${gallery.id}`;
    const date = moment(gallery.shootDate).format('YYYY-MM-DD');

    return (
      <div className="gallery-card">
        <Link to={ galleryViewLink }>
          <img src={ thumbnailPreview } />
          <div className="title">
            <div className="text">
              <span className="name">{ gallery.name }</span>
              <span className="date">{ date } </span>
            </div>
          </div>
        </Link>
      </div>
    )
  }
}

@observer
class GalleryList extends React.Component {
  render() {
    const allGalleries = this.props.galleries;

    // Filter to ensure all is published, safety precaution
    const publishedGalleries = _.chain(allGalleries)
      .filter({ published: true })
      .map(gallery => {
        return (<Gallery key={ gallery.id } gallery={ gallery } />);
      })
      .value();

    return (
      <div className="gallery-list">
        { publishedGalleries }
      </div>
    )
  }
}

class PaginatedGalleryList extends React.Component {
  static propTypes = {
    paginatedGalleries: PropTypes.object.isRequired
  };

  constructor(props) {
    super(props);

    const pageNumber = _.get(props, 'routeParams.pageNumber', 1);
    window.history.replaceState({ pageNumber: pageNumber }, null,  `/gallery/page/${pageNumber}`);
    if (pageNumber != 1) {
      this.props.paginatedGalleries.setPage(pageNumber);
    }

    window.onpopstate = (event => {
      const pageNumber = _.get(event, 'state.pageNumber', 1);
      this.props.paginatedGalleries.setPage(pageNumber);
      this.forceUpdate();
    }).bind(this);
  }

  @keydown(Keys.right)
  nextPage(event) {
    event.preventDefault();
    this.props.paginatedGalleries.nextPage()
      .then(this.loadPage.bind(this))
      .catch(() => undefined);
  }

  @keydown(Keys.left)
  prevPage(event) {
    event.preventDefault();
    this.props.paginatedGalleries.prevPage()
      .then(this.loadPage.bind(this))
      .catch(() => undefined);
  }

  loadPage(pageNumber) {
    window.history.pushState({ pageNumber: pageNumber }, null, `/gallery/page/${pageNumber}`);
    this.forceUpdate()
  }

  render() {
    const galleries = this.props.paginatedGalleries.currentPageData;
    const currentPage = this.props.paginatedGalleries.currentPage;
    const maxPage = this.props.paginatedGalleries.maxPage;

    return (
      <div>
        <GalleryList galleries={ galleries } />
        <div className="gallery-pagination">
          <a onClick={ this.prevPage.bind(this) } type="button">Föregående</a>
          <span>sida { currentPage } / { maxPage } </span>
          <a onClick={ this.nextPage.bind(this) } type="button">Nästa</a>
        </div>
      </div>
    );
  }
}

const PaginatedGalleryListContainer = PreloadContainerFactory((props) => {
  return GalleryStore.fetchAllGalleries()
    .then(galleries => {
      return {
        paginatedGalleries: new PaginatedArray(galleries, 28),
        ...props
      }
    });
}, PaginatedGalleryList);

export default PaginatedGalleryListContainer;
