import React from 'react';
import {Client4} from 'mattermost-redux/client';

// Set this to your Mattermost SiteURL.
const MATTERMOST_URL = 'http://localhost:8065';
// Set this to the Client ID received after registering an OAuth app with Mattermost.
const OAUTH_APP_CLIENT_ID = 'FILL ME IN';
// Set to blank or "saml". When set to "saml", automatically redirect user to the SAML IDP's login page, skipping the Mattermost login page.
const LOGIN_HINT = '';

export default class App extends React.Component {
    constructor(props) {
        super(props);

        // Set the Mattermost URL to use for the JS client.
        Client4.setUrl(MATTERMOST_URL);

        this.oauthState = '';

        this.state = {
            user: null,
        };
    }

    componentDidMount() {
        document.title = browser.runtime.getManifest().name;
        this.loadToken();
    }

    // Try to load the access token from storage and fetch the user if we have it.
    loadToken = () => {
        console.log('loadToken');
        browser.storage.sync.get(['access_token'], (result) => {
            console.log(result);
            if (result.access_token) {
                console.log('found access token');
                this.getUser(result.access_token);
            }
        });
    }

    // Begins the OAuth flow.
    handleLogin = () => {
        const redirectUrl = encodeURIComponent(browser.identity.getRedirectURL());
        const clientId = encodeURIComponent(OAUTH_APP_CLIENT_ID);

        // Use a randomly generated string for the OAuth state
        this.oauthState = Math.random().toString(36);
        const state = encodeURIComponent(this.oauthState);

        browser.identity.launchWebAuthFlow({url: MATTERMOST_URL+'/oauth/authorize?response_type=token&client_id='+clientId+'&redirect_uri='+redirectUrl+'&state='+state+'&login_hint='+LOGIN_HINT, interactive: true}, this.completeLogin);
    }

    // Called when the OAuth flow is complete, parsing the state and access token out of the URL fragment and storing it.
    completeLogin = (responseUrl) => {
        console.log("completeLogin");
        const state = getParameterByName('state', responseUrl);
        console.log(state);

        // The OAuth state must match per https://tools.ietf.org/html/rfc6749#section-10.12
        if (state !== this.oauthState) {
            console.error("invalid state");
            return;
        }

        const accessToken = getParameterByName('access_token', responseUrl);
        console.log("access_token "+accessToken);
        browser.storage.sync.set({access_token: accessToken});
    }

    // Demo use of the access token to get the logged in user.
    getUser = async (accessToken) => {
        console.log(window.location.href);
        Client4.setToken(accessToken);
        Client4.setIncludeCookies(false);
        try {
            const user = await Client4.getMe();
            console.log(user);
            this.setState({user});
        } catch (error) {
            console.error(error);
            this.setState({user: null});
        }
    }

    render() {
        console.log("render")
        let content;
        if (this.state.user) {
            console.log("user")

            const user = this.state.user;
             content = (
                  <div>
                    <p>Username: {user.username}</p>
                    <p>Email: {user.email}</p>
                  </div>
             );
        } else {
            console.log("not logged in")

            content = (
                <button
                    onClick={this.handleLogin}
                >
                    Click here to connect to Mattermost.
                </button>
            );
        }

        return (
            <div>
                <img
                    src='/public/img/icon.png'
                    style={{width: '100px', height: '100px'}}
                />
                <h3>{browser.runtime.getManifest().name}</h3>
                {content}
            </div>
        );
    }
}

// Based on https://stackoverflow.com/a/901144
function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[#&]' + name + '(=([^&#]*)|&|#|$)'),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// https://stackoverflow.com/a/2117523
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
