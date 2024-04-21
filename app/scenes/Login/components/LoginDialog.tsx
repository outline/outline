import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import ButtonLarge from "~/components/ButtonLarge";
import Input from "~/components/Input";
import Text from "~/components/Text";
import { navigateToSubdomain } from "../urls";

type FormData = {
  subdomain: string;
};

export function LoginDialog() {
  const { t } = useTranslation();

  const handleSubmit = async (data: FormData) => {
    try {
      await navigateToSubdomain(data.subdomain);
    } catch {
      toast.error(t("The workspace could not be found"));
    }
  };

  const { register, handleSubmit: formHandleSubmit } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      subdomain: "",
    },
  });

  return (
    <form onSubmit={formHandleSubmit(handleSubmit)}>
      <Text as="p">{t("To continue, enter your workspace’s subdomain.")}</Text>
      <Input
        autoFocus
        maxLength={255}
        autoComplete="off"
        placeholder={t("subdomain")}
        {...register("subdomain", { required: true, pattern: /^[a-z\d-]+$/ })}
      >
        <Domain>.getoutline.com</Domain>
      </Input>
      <ButtonLarge type="submit" fullwidth>
        {t("Continue")}
      </ButtonLarge>
    </form>
  );
}

const Domain = styled.div`
  color: ${s("textSecondary")};
  padding: 0 8px 0 0;
`;
