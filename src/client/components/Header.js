import React from "react";
import {Link} from "react-router-dom";
import {observer} from 'mobx-react';

import TagSearchBar from './TagSearchBar';
import uiState from '../UiState';

@observer
class Header extends React.Component {
  render() {
    return (
      <div className="header">
        <div className="header-content">
          <Link to="/"><img src="/assets/images/logo-frukost.png"/></Link>
          <ul>
            <li>
              <Link to="/"> Bilder </Link>
            </li>
            <li>
              <Link to="/about"> Om sidan </Link>
            </li>
            { uiState.user.isLoggedIn && uiState.user.role != 'None' ?
              <li>
                <Link to="/admin">Admin </Link>
              </li>
              : null }
          </ul>

          <div className="info">
            <TagSearchBar />
          </div>

        </div>
      </div>
    );
  }
}

export default Header;
