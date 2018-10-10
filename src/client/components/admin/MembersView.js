import _ from 'lodash';
import React from 'react';

import {observable} from 'mobx';
import {observer} from 'mobx-react';

import UserStore, {EligibleUser} from '../../UserStore';
import PreloadContainerFactory from '../PreloadContainerFactory';

@observer
class EligibleMembers extends React.Component {
  state = {
    cid: '',
    role: 'None'
  };

  onCidChange(event) {
    this.setState({cid: event.target.value});
  }

  onRoleChange(event) {
    this.setState({role: event.target.value});
  }

  onAddEligibleUser(event) {
    const {cid, role} = this.state;
    EligibleUser.create(cid, role)
      .then(() => {
        this.props.members.push(new EligibleUser(this.state));
        this.setState({cid: '', role: 'None'});
      });
  }

  onDeleteEligibleUser(user) {
    return (event) => {
      user.remove().then(() => {
        _.remove(this.props.members, user);
      });
    };
  }

  render() {
    const eligibleUsers = this.props.members;

    const cid = _.get(this, 'state.cid', '');
    const role = _.get(this, 'state.role', '');

    const toBeMembers = _.map(eligibleUsers, eligibleUser => {
      return (
        <tr key={eligibleUser.cid}>
          <td>{eligibleUser.cid}</td>
          <td>{eligibleUser.role}</td>
          <td><button onClick={this.onDeleteEligibleUser(eligibleUser).bind(this)}>Ta bort</button></td>
        </tr>
      );
    });

    return (
      <div>
        <input type="text" onChange={this.onCidChange.bind(this)} value={cid}/>
        <select value={role} onChange={this.onRoleChange.bind(this)}>
          <option value="Admin">Admin</option>
          <option value="FrukostFoto">FrukostFoto</option>
          <option value="Aspirant">Aspjävel</option>
          <option value="None">-</option>
        </select>
        <button onClick={this.onAddEligibleUser.bind(this)}>Lägg till</button>

        <table>
          <thead>
            <tr>
              <th>cid</th>
              <th>roll</th>
              <th> </th>
            </tr>
          </thead>
          <tbody>
            {toBeMembers}
          </tbody>
        </table>
      </div>
    );
  }
}

@observer
class Member extends React.Component {
  onRoleChange(event) {
    const newRole = event.target.value;
    this.props.member.setRole(newRole);
  }

  render() {
    const member = this.props.member;
    return (
      <tr key={ member.cid }>
        <td> {member.cid} </td>
        <td> {member.fullname} </td>
        <td>
          <select value={member.role} onChange={this.onRoleChange.bind(this)}>
            <option value="Admin">Admin</option>
            <option value="FrukostFoto">FrukostFoto</option>
            <option value="Aspirant">Aspjävel</option>
            <option value="None">-</option>
          </select>
        </td>
      </tr>
    );
  }
}

@observer
class MembersView extends React.Component {
  onSearchRegular(event) {
    const searchValue = event.target.value;

    this.setState({ regularSearch: searchValue });
  }

  render() {
    const regularSearch = _.get(this.state, 'regularSearch', '');
    const {users, eligibleUsers} = this.props;

    const members = _.chain(users)
      .filter(user => {
        return regularSearch == '' || user.cid.startsWith(regularSearch);
      })
      .map(member => {
        return <Member key={ member.cid } member={ member } />;
      })
      .value();

    return (
      <div>
        <p>Här kan du ge andra personer access till att ladda upp bilder - och i sin tur att ge andra personer
          access.</p>

        <h3>Fördefinierade roller</h3>
        <EligibleMembers members={eligibleUsers}/>

        <h3>Medlemmar ({members.length} st)</h3>
        Sök: <input onChange={ this.onSearchRegular.bind(this) } type="text" />
        <table>
          <thead>
            <tr>
              <th> cid </th>
              <th> namn </th>
              <th> roll </th>
            </tr>
          </thead>
          <tbody>
            {members}
          </tbody>
        </table>
      </div>
    );
  }
}

const MembersViewContainer = PreloadContainerFactory((props) => {
  const userPromise = UserStore.fetchAllUsers();
  const eligibleUserPromise = UserStore.fetchEligibleUsers();

  return Promise.all([userPromise, eligibleUserPromise])
    .then(([users, eligibleUsers]) => {
      return {
        users: observable(users),
        eligibleUsers: observable(eligibleUsers)
      }
  });
}, MembersView);

export default MembersViewContainer;
