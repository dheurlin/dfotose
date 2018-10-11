import React from 'react';
import {withRouter} from 'react-router-dom';
import {observer} from 'mobx-react';

import ImageList from './ImageList';
import LoadingSpinner from './LoadingSpinner';

import LoginRequired from '../LoginRequired'

import uiState from '../UiState';

@observer
class TagSearchView extends React.Component {
  constructor(props) {
    super(props);

    const tag = _.get(props, 'match.params.tag');
    this.state = {
      tag: tag,
      imageList: uiState.imageStore.getImagesForTag(tag),
      showSpinner: true
    };
  }

  componentWillReceiveProps(newProps) {
    if (this.state.tag != newProps.match.params.tag) {
      const tag = _.get(newProps, 'match.params.tag');
      this.setState({
        tag: tag,
        imageList: uiState.imageStore.getImagesForTag(tag),
        showSpinner: true
      });
    }
  }

  onImageClick(image) {
    const imageViewLink = `/gallery/${image.galleryId}/image/${image.id}`;
    this.props.history.push(imageViewLink);
  }

  onAllImagesLoaded() {
    this.setState({ showSpinner: false });
  }

  render() {
    if (!uiState.user.isLoggedIn || uiState.user.role == 'None') {
      return (<LoginRequired />);
    }

    const {tag, showSpinner} = this.state;
    const images = this.state.imageList.images.toJS();

    const hasResults = _.get(images, 'length', 0) != 0;

    return (
      <div className="tag-search-view">
        <h2>Taggsökning: <span className="tag">{ tag }</span></h2>
        { !hasResults ? <p>Inga resultat hittade.</p> : <LoadingSpinner visible={ showSpinner } /> }
        <ImageList images={ images } onAllLoaded={ this.onAllImagesLoaded.bind(this) } onImageClick={ this.onImageClick.bind(this) } />
      </div>
    )
  }
}

export default withRouter(TagSearchView);
