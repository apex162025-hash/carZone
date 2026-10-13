import "@tanstack/react-query";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** Skip the global error toast (the UI renders the error inline). */
      skipErrorToast?: boolean;
    };
  }
}
