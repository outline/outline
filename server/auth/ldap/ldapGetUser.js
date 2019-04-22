// @flow
import LdapClient from 'promised-ldap';

function getUser(identifier: string, password: string): Promise<any> {
  return new Promise((resolve, reject) => {
    var client = new LdapClient({ url: process.env.LDAP_URL });
    var opts = {
      filter: (process.env.LDAP_USERS_FILTER || 'uid={0}').replace(
        '{0}',
        identifier
      ),
      scope: 'sub',
      attributes: ['cn', process.env.LDAP_USER_MAIL_ATTR || 'mail', 'uid'],
    };

    var result = {};
    var shouldTry = true;
    if (process.env.LDAP_REVERSE_PROXY_HEADER) {
      shouldTry = false;
    }
    var authed = false;
    client
      .bind(process.env.LDAP_ADMIN_USER, process.env.LDAP_ADMIN_PASSWORD)
      .then(function() {
        //Login to LDAP
        authed = true;
        var users = (process.env.LDAP_ADDITIONAL_USERS_DN || '') + ',';
        if (users === ',') {
          users = '';
        }
        const scope = users + process.env.LDAP_BASE_DN;
        return client.search(scope, opts);
      })
      .then(function(result) {
        //Find user
        var results = [];
        if (result.entries.length === 0) throw new Error('User not found');
        result.entries.forEach(entry => {
          results.push(parseUser(entry)); //Parse found user
        });
        return results[0];
      })
      .then(function(user) {
        //find groups of user
        return getGroups(user.dn, user);
      })
      .then(function(user) {
        //Try login as user
        result = user;
        if (shouldTry) {
          return client.bind(user.dn, password);
        } else {
          return;
        }
      })
      .then(function() {
        resolve(result);
        client.unbind();
      })
      .catch(function(err) {
        if (!authed) {
          if (err.name === 'InvalidCredentialsError') {
            err = new Error("Couldn't connect to LDAP");
          }
        }
        reject(err);
      });
  });
}

function getGroups(userDN, user) {
  return new Promise((resolve, reject) => {
    var client = new LdapClient({ url: process.env.LDAP_URL });
    var opts = {
      filter: (
        process.env.LDAP_GROUPS_FILTER ||
        '(&(member={0})(objectclass=groupOfNames))'
      ).replace('{0}', userDN),
      scope: 'sub',
      attributes: [process.env.LDAP_GROUP_NAME_ATTR || 'cn'],
    };
    client
      .bind(process.env.LDAP_ADMIN_USER, process.env.LDAP_ADMIN_PASSWORD)
      .then(function() {
        //Login to LDAP
        var groups = (process.env.LDAP_ADDITIONAL_GROUPS_DN || '') + ',';
        if (groups === ',') {
          groups = '';
        }
        const scope = groups + process.env.LDAP_BASE_DN;
        return client.search(scope, opts);
      })
      .then(function(result) {
        //Find group
        var results = [];
        result.entries.forEach(entry => {
          results.push(parseGroup(user, entry)); //Parse found group
        });
        resolve(user);
        client.unbind();
      })
      .catch(function(err) {
        reject(err);
      });
  });
}

function parseUser(entry) {
  var user = { dn: entry.objectName, groups: [] };
  entry.attributes.forEach(attr => {
    user[attr.type] = attr._vals[0].toString();
  });
  return user;
}

function parseGroup(user, entry) {
  user.groups.push(entry.attributes[0]._vals[0].toString());
}

export default getUser;
