import React from 'react';
import {observer} from 'mobx-react';

import UploadImagesForm from './UploadImagesForm';
import UserStore from '../../UserStore'

const GalleryImagesView = observer(({imageList, userList}) => {
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

  const onUserChange = (image) => {
    return (event) => {
        const newCid = event.target.value;
        image.changeAuthor(newCid);
    };
  };

  const userMenu = (currImage) => {
    const userOpts = _.map(userList, user => {
      return (<option value={ user.data.cid } > { user.fullname } </option>)
    });

    return (
        <select name="users" value={currImage.data.authorCid} onChange={onUserChange(currImage).bind(this)}>
            { userOpts }
        </select>
    )
  }


  const images = _.map(imageList.images.toJS(), image => {
    const className = image.isMarked ? 'marked' : '';
    const currAuthor = image.data.authorCid;

    return (
      <tr key={image.filename} className={className} >
        <td> <input type="checkbox" checked={image.isMarked} onChange={onToggleImage(image).bind(this)}/></td>
        <td> {userMenu(image)} </td>
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
