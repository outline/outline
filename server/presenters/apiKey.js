function present(ctx, key) {
  return {
    id: key.id,
    name: key.name,
    secret: key.secret,
  };
}

export default present;
