import _ from 'lodash';
import React from 'react';
import uiState from '../../UiState';
import PropTypes from 'prop-types';

export default class UploadImagesForm extends React.Component {
  static propTypes = {
    galleryImageList: PropTypes.object
  };

  constructor(props) {
    super(props);

    this.state = {
      percentDone: 0,
      isUploading: false
    };
  }

  onSubmit(event) {
    event.preventDefault();
    this.setState({ isUploading: true });

    const formData = new FormData();
    const fileElement = document.getElementById('image');
    const files = fileElement.files;
    _.forEach(files, file => {
      formData.append('photos', file);
    });

    const onProgress = (percent => {
      this.setState({ percentDone: percent });

      if (percent >= 100) {
        this.setState({ isUploading: false });
      }
    }).bind(this);

    this.props.galleryImageList.addImages(formData, onProgress);
  }

  render() {
    const {percentDone, isUploading} = this.state;

    const formUpload = (
      <form onSubmit={ this.onSubmit.bind(this) }>
        <h1> Ladda upp bilder </h1>
        <input id="image" type="file" className="u-full-width" name="photos" accept="image/*" multiple />
        <input className="button-primary button-orange" type="submit" value="Upload" name="submit" />
      </form>
    );

    const progressBar = (
      <div>
        <p>Laddar upp: {percentDone}% klart.</p>
      </div>
    );

    return (
      <div>
        { isUploading ? progressBar : formUpload }
      </div>
    );
  }
}
