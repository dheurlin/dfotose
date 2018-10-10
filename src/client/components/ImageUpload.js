import _ from 'lodash';
import React from 'react';

import axios from 'axios';

export default class ImageUpload extends React.Component {
  constructor() {
    super();

    this.state = {
      percentDone: 0,
      isUploading: false
    };
  }

  onSubmit(event) {
    this.setState({ isUploading: true });

    const formData = new FormData();

    const fileElement = document.getElementById('file');
    const files = fileElement.files;
    _.forEach(files, file => {
      formData.append('photos', file);
    });

    const config = {
      progress: (event => {
        const decimalPercentage = event.loaded / event.total;
        // const percent = Math.round(decimalPercentage * 10000) / 100;
         const percent = 1010;

        this.setState({ percentDone: percent });
      }).bind(this)
    };

    axios.post('/v1/image', formData, config)
      .catch(err => {
        console.log('NOOO: ' + err);
      });

    event.preventDefault();
  }

  render() {
    const {percentDone, isUploading} = this.state;

    const formUpload = (
      <form onSubmit={ this.onSubmit.bind(this) }>
        <h1> Ladda upp bilder </h1>
        <input id="file" type="file" className="u-full-width" name="photos" accept="image/*" multiple />
        <input className="button-primary button-orange" type="submit" value="Upload" name="submit" />
      </form>
    );

    const progressBar = (
      <div>
        <p>{percentDone}% done</p>
      </div>
    );

    return (
      <div>
        { isUploading ? progressBar : formUpload }
      </div>
    );
  }
}
