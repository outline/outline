import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { toast } from "sonner";
import Modal from "~/components/Modal";
import Input from "~/components/Input";
import Button from "~/components/Button";
import Text from "~/components/Text";
import { client } from "~/utils/ApiClient";

interface Props {
    isOpen: boolean;
    onRequestClose: () => void;
    onSuccess: (email: string) => void;
}

const ForgotPasswordModal: React.FC<Props> = ({
    isOpen,
    onRequestClose,
    onSuccess,
}) => {
    const { t } = useTranslation();
    const [email, setEmail] = React.useState("");
    const [isSubmitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!email) {
            setError(t("Email is required"));
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await client.post(
                "/password.reset.request",
                {
                    email: email.trim(),
                },
                {
                    baseUrl: "/auth",
                }
            );
            onSuccess(email.trim());
            toast.success(t("Check your email for reset instructions"));
            onRequestClose();
            setEmail("");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : t("Something went wrong, please try again.")
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            onRequestClose();
            setSubmitting(false);
            setError(null);
            setEmail("");
        }
    };

    return (
        <Modal isOpen={isOpen} onRequestClose={() => handleOpenChange(false)} title={t("Reset password")}>
            <Form onSubmit={handleSubmit}>
                <Text as="p" type="secondary">
                    {t("Enter the email associated with your account and we'll send you a reset link.")}
                </Text>
                <Input
                    type="email"
                    placeholder="me@domain.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoFocus
                />
                {error && <ErrorText role="alert">{error}</ErrorText>}
                <Button type="submit" disabled={isSubmitting} primary>
                    {isSubmitting ? t("Sending…") : t("Send reset link")}
                </Button>
            </Form>
        </Modal>
    );
};

const Form = styled.form`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ErrorText = styled(Text)`
  color: ${(props) => props.theme.danger};
`;

export default ForgotPasswordModal;
