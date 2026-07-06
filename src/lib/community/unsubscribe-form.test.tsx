import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommunityUnsubscribeForm } from "./unsubscribe-form";

describe("CommunityUnsubscribeForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends bot protection fields with the unsubscribe payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<CommunityUnsubscribeForm />);

    fireEvent.change(screen.getByLabelText("Email inscrito"), {
      target: { value: "ana@example.test" },
    });
    fireEvent.click(screen.getByLabelText(/Confirmo que quiero dejar de recibir/));

    await waitFor(() => {
      expect(
        container.querySelector<HTMLInputElement>('input[name="submittedAt"]')?.value,
      ).not.toBe("");
    });

    fireEvent.click(screen.getByRole("button", { name: "Solicitar baja" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      email: "ana@example.test",
      confirmation: "on",
      companyWebsite: "",
      submittedAt: expect.any(String),
    });
  });
});
