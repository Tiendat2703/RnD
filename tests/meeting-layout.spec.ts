import { expect, test } from "@playwright/test";

test("shows a live audio join form with an invite room prefilled", async ({ page }) => {
  await page.goto("/?room=team-weekly");
  await expect(page.getByRole("heading", { name: "Tham gia cuộc gọi" })).toBeVisible();
  await expect(page.getByLabel("Tên phòng")).toHaveValue("team-weekly");
  await expect(page.getByLabel("Tên của bạn")).toBeVisible();
  await expect(page.getByLabel("Mã vào phòng (nếu được cấp)")).toBeVisible();
  await expect(page.getByText("Transcript cuộc họp")).toHaveCount(0);
});

test("shows a server error when a LiveKit token cannot be issued", async ({ page }) => {
  await page.route("**/api/livekit-token", async (route) => {
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "LiveKit chưa được cấu hình trên server." }) });
  });
  await page.goto("/");
  await page.getByLabel("Tên của bạn").fill("An");
  await page.getByRole("button", { name: "Vào phòng" }).click();
  await expect(page.getByRole("alert")).toHaveText("LiveKit chưa được cấu hình trên server.");
});

test("manual token mode accepts a LiveKit URL and token without the app token endpoint", async ({ page }) => {
  let endpointCalled = false;
  await page.route("**/api/livekit-token", async (route) => {
    endpointCalled = true;
    await route.abort();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Dùng token có sẵn" }).click();
  await expect(page.getByLabel("LiveKit server URL")).toBeVisible();
  await expect(page.getByLabel("Token người tham gia")).toBeVisible();
  await page.getByLabel("LiveKit server URL").fill("wss://example.livekit.cloud");
  await page.getByLabel("Token người tham gia").fill("invalid-token");
  await page.getByRole("button", { name: "Vào phòng" }).click();
  await expect(page.getByRole("alert")).toHaveText("Token không chứa quyền vào phòng LiveKit hợp lệ.");
  expect(endpointCalled).toBe(false);
});
