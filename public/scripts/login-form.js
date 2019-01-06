window.onload = () => {
    if (document.querySelector('#authing-login-form-wrapper')) {
        new AuthingForm({ 
            clientId: '5bf36ad6a9e256000132cebf',
            secret: 'c15331f0f3361acd83005871801ec613',
            mountId: 'authing-login-form-wrapper',
            hideUP: true,
            title: '大事记',
            hideOAuth: true,
            hideClose: true,
            logo: 'https://user-images.githubusercontent.com/31465/34380645-bd67f474-eb0b-11e7-8d03-0151c1730654.png'
        });
    }

    if (document.querySelector('#authing-login-form-wrapper-invite')) {
        const form = new AuthingForm({
            clientId: '5bf36ad6a9e256000132cebf',
            secret: 'c15331f0f3361acd83005871801ec613',
            mountId: 'authing-login-form-wrapper-invite',

            hideUP: true,
            hideClose: true,
            hideOAuth: true,

            qrcodeScanning: {
                redirect: false
            },

            title: '大事记',
            logo: 'https://user-images.githubusercontent.com/31465/34380645-bd67f474-eb0b-11e7-8d03-0151c1730654.png'
        });

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