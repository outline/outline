import React, { Component } from 'react';

import Auth from '../../Utils/Auth';

export default class Login extends Component {
  static propTypes = {
    location: React.PropTypes.object,
  }

  static contextTypes = {
    router: React.PropTypes.object.isRequired,
  }

  state = {
    email: '',
    password: '',
    error: null,
  }

  handleEmailChange = (event) => {
    this.setState({ email: event.target.value });
  }

  handlePasswordChange = (event) => {
    this.setState({ password: event.target.value });
  }

  handleSubmit = (event) => {
    event.preventDefault();

    Auth.login(this.state.email, this.state.password)
    .then(() => {
      const { location } = this.props;

      if (location.state && location.state.nextPathname) {
        this.context.router.replace(location.state.nextPathname);
      } else {
        this.context.router.replace('/dashboard');
      }
    })
    .catch((err) => {
      this.setState({ error: err.error });
    });
  }

  render() {
    return (
      <div>
        <h2>Login</h2>
        <form action="" onSubmit={ this.handleSubmit }>
          {this.state.error && (
            <p>{ this.state.error }</p>
          )}

          <div>
            <input
              placeholder={ 'Email' }
              onChange={ this.handleEmailChange }
            />
          </div>
          <div>
            <input
              placeholder={ 'Password' }
              type={ 'password' }
              onChange={ this.handlePasswordChange }
            />
          </div>
          <div>
            <input type={ 'submit' } />
          </div>
        </form>
      </div>
    );
  }
}
