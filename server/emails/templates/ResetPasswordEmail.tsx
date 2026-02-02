import env from "@server/env";
import type { EmailProps } from "./BaseEmail";
import BaseEmail, { EmailMessageCategory } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type Props = EmailProps & {
    token: string;
    teamName: string;
    teamUrl: string;
};

export default class ResetPasswordEmail extends BaseEmail<Props, void> {
    protected get category() {
        return EmailMessageCategory.Authentication;
    }

    protected subject({ teamName }: Props) {
        return `${teamName} password reset`;
    }

    protected preview(): string {
        return `Reset your password on ${env.APP_NAME}.`;
    }

    protected renderAsText({ token, teamUrl }: Props): string {
        const url = this.resetLink(teamUrl, token);

        return `You recently requested to reset your password.

Use the link below to choose a new password:

${url}

If you did not request this change you can ignore this email.`;
    }

    protected render({ token, teamName, teamUrl }: Props) {
        const url = this.resetLink(teamUrl, token);

        return (
            <EmailTemplate
                previewText={this.preview()}
                goToAction={{ url, name: "Reset password" }}
            >
                <Header />
                <Body>
                    <Heading>Reset your password</Heading>
                    <p>
                        You recently requested to reset your password for {teamName}. Click
                        the button below to choose a new password.
                    </p>
                    <EmptySpace height={20} />
                    <p>
                        <Button href={url}>Reset password</Button>
                    </p>
                    <EmptySpace height={16} />
                    <p>
                        If you did not make this request, you can safely ignore this email.
                    </p>
                </Body>
                <Footer />
            </EmailTemplate>
        );
    }

    private resetLink(teamUrl: string, token: string) {
        const separator = teamUrl.includes("?") ? "&" : "?";
        return `${teamUrl}${separator}resetToken=${token}`;
    }
}
