import * as React from "react";
import ButtonLarge from "components/ButtonLarge";

type Props = {
  bot_id: int,
  icon: object,
};

type State = {
  telegramLoaded: boolean,
};

class TelegramLoginButton extends React.Component<Props, State> {
  state = {
    telegramLoaded: false,
  };

  handleTelegramLoaded = (e)=>{
    this.setState({
      telegramLoaded:true
    })
  }

  render() {
    const { bot_id, icon } = this.props;
    var _this = this;
      
    var TelegramLoginScript = function TelegramLoginScript(props) {
      // https://stackoverflow.com/a/63593384

      var ref = React.useRef(null);
      React.useEffect(function () {
        if (ref.current === null) return;
        if (!_this.state.telegramLoaded) {
          var script = document.createElement('script');
          script.src = 'https://telegram.org/js/telegram-widget.js';
          script.onload =() => {
            // script has been loaded
            _this.handleTelegramLoaded();
          };
          ref.current.appendChild(script);
        }
      }, [ref]);
      return React.createElement("div", {
        ref: ref,
      });
    };

    var telegramLogin = function telegramLogin(bot_name) {
      console.log("Telegram login with: " + bot_name);
      window.Telegram.Login.auth(
        { bot_id: bot_name, request_access: true },
        (data) => {
          if (!data) {
            // console.log("Login Failed");
            location.href=`/?notice=auth-error`;
          }
          // console.log("Login Success: " + data);
          location.href=`/auth/telegram?id=${data.id}&first_name=${data.first_name}&last_name=${data.last_name}&username=${data.username}&auth_date=${data.auth_date}&hash=${data.hash}`;
        });
    };

    return (
        <>
        <ButtonLarge
          onClick={() => (telegramLogin(bot_id))}
          icon={icon}
          disabled={!this.state.telegramLoaded}
          fullwidth
        >
          Continue with Telegram
        </ButtonLarge>
        <TelegramLoginScript />
        </>
    );
  };
}

export default TelegramLoginButton;
