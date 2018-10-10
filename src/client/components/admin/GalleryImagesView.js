import React from 'react';
import {observer} from 'mobx-react';

import UploadImagesForm from './UploadImagesForm';
import UserStore from '../../UserStore'

const GalleryImagesView = observer(({imageList}) => {
  const onToggleImage = (image) => {
    return (event) => {
      if (image.isMarked) {
        image.unmark();
      } else {
        image.mark();
      }
    };
  };

  const onRemoveClick = (event) => {
    imageList.removeMarkedImages();
  };

  const images = _.map(imageList.images.toJS(), image => {
    const className = image.isMarked ? 'marked' : '';
    // const userPromise = UserStore.fetchAllUsers();

    return (
      <tr key={image.filename} className={className} onClick={onToggleImage(image).bind(this)}>
        <td> <input type="checkbox" checked={image.isMarked} onClick={onToggleImage(image).bind(this)}/></td>
        <td> {image.author} </td>
        <td> {image.filename} </td>
        <td> <img key={ image.filename } src={ image.thumbnail } /> </td>
      </tr>
    );
  });

  return (
    <div>
      <UploadImagesForm galleryImageList={ imageList } />
      <p> Tänk på att när du laddar upp bilder kan det ta någon minut innan de dyker upp nedan. Det är för att de måste
      hanteras utav servern innan de kan användas. </p>
      <hr/>
      <b>Markerade bilder: </b>
      <button type="button" className="button-danger" onClick={onRemoveClick}>Ta bort</button>
      <table className="u-full-width admin-image-list">
        <thead>
          <tr>
            <th>#</th>
            <th>fotograf</th>
            <th>filnamn</th>
            <th>bild</th>
          </tr>
        </thead>
        <tbody>
          { images }
        </tbody>
      </table>
    </div>
  );
});

export default GalleryImagesView;
