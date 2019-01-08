window.onload = () => {
    let options = {
        clientId: '5c344f102e450b000170190a',
        secret: '03bb8b2fca823137c7dec63fd0029fc2',
        mountId: 'authing-login-form-wrapper',
        hideUP: true,
        title: '大事记',
        hideOAuth: true,
        hideClose: true,
        logo: 'https://user-images.githubusercontent.com/31465/34380645-bd67f474-eb0b-11e7-8d03-0151c1730654.png'
    }
    if (document.querySelector('#authing-login-form-wrapper')) {
        new AuthingForm(options);
    }

    if (document.querySelector('#authing-login-form-wrapper-invite')) {
        options['hideOAuth'] = true;
        options['qrcodeScanning'] = {
            redirect: false
        };
        options['mountId'] = 'authing-login-form-wrapper-invite';
        const form = new AuthingForm(options);

        form.on('scanning', function (data) {
            console.log('on scanning success', data);
            const teamId = location.pathname.split('/invite/')[1];
            location.href = data.redirect + '?code=' + data.code + '&data=' + JSON.stringify(data.data) + '&teamId=' + teamId;
        });
          
        form.on('scanningError', function (error) {
            console.log('on scanning error', error);
        });        
    }
}