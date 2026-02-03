import { test, expect } from "@playwright/test";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const selectRandomCards = async (
  page: import("@playwright/test").Page,
  count: number,
  includeModifiers = false,
) => {
  const cardButtons = page.locator(".cards-panel button");
  await expect(cardButtons.first()).toBeVisible();

  const labels = (await cardButtons.allTextContents())
    .map((label) => label.trim())
    .filter(Boolean);

  const unique = Array.from(new Set(labels));
  const numberLabels = unique.filter((label) => /^\d+$/.test(label));
  const modifierLabels = unique.filter(
    (label) => label.startsWith("+") || label === "x2",
  );
  const pool = includeModifiers
    ? [...numberLabels, ...modifierLabels]
    : numberLabels;

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  for (const label of selected) {
    await page
      .locator(".cards-panel button", {
        hasText: new RegExp(`^${escapeRegExp(label)}$`),
      })
      .click();
  }
};

const waitForLobbyReady = async (
  page: import("@playwright/test").Page,
  name: string,
) => {
  await expect(page.getByRole("heading", { name })).toBeVisible();
};

const selectCardsByLabels = async (
  page: import("@playwright/test").Page,
  labels: string[],
) => {
  const cardButtons = page.locator(".cards-panel button");
  await expect(cardButtons.first()).toBeVisible();

  for (const label of labels) {
    await page
      .locator(".cards-panel button", {
        hasText: new RegExp(`^${escapeRegExp(label)}$`),
      })
      .click();
  }
};

const joinLobby = async (
  page: import("@playwright/test").Page,
  code: string,
  name: string,
) => {
  await page.goto(`/lobby/${code}`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Your Name").fill(name);
  await page.getByRole("button", { name: "Join Lobby" }).click();
  await waitForLobbyReady(page, name);
};

test("full game", async ({ browser }) => {
  const videoDir = join(process.cwd(), "test-results", "host-flow-videos");
  if (!existsSync(videoDir)) {
    mkdirSync(videoDir, { recursive: true });
  }

  const hostContext = await browser.newContext({
    recordVideo: { dir: videoDir },
  });
  const playerOneContext = await browser.newContext({
    recordVideo: { dir: videoDir },
  });
  const playerTwoContext = await browser.newContext({
    recordVideo: { dir: videoDir },
  });

  const hostPage = await hostContext.newPage();
  const playerOnePage = await playerOneContext.newPage();
  const playerTwoPage = await playerTwoContext.newPage();

  const hostVideo = hostPage.video();
  const playerOneVideo = playerOnePage.video();
  const playerTwoVideo = playerTwoPage.video();

  const hostName = "Host One";
  const playerOneName = "Player One";
  const playerTwoName = "Player Two";

  await hostPage.goto("/start", { waitUntil: "domcontentloaded" });
  await hostPage.getByLabel("Who is the host?").fill(hostName);
  await hostPage.getByRole("button", { name: "Enter Lobby" }).click();
  await hostPage.waitForURL("**/lobby/**");
  await waitForLobbyReady(hostPage, hostName);

  const lobbyPath = new URL(hostPage.url()).pathname;
  const code = lobbyPath.split("/lobby/")[1];
  expect(code).toBeTruthy();

  await joinLobby(playerOnePage, code, playerOneName);
  await joinLobby(playerTwoPage, code, playerTwoName);

  const startGameButton = hostPage.getByRole("button", { name: "Start Game" });
  await expect(startGameButton).toBeEnabled();

  await Promise.all([
    hostPage.waitForURL(`**/game/${code}`),
    playerOnePage.waitForURL(`**/game/${code}`),
    playerTwoPage.waitForURL(`**/game/${code}`),
    startGameButton.click(),
  ]);

  const submitHost = hostPage.getByRole("button", { name: "Submit Score" });
  const submitPlayerOne = playerOnePage.getByRole("button", {
    name: "Submit Score",
  });
  const submitPlayerTwo = playerTwoPage.getByRole("button", {
    name: "Submit Score",
  });

  const hostWinningHand = ["12", "11", "10", "+10", "x2"];
  const roundCount = 3;

  for (let round = 1; round <= roundCount; round += 1) {
    await Promise.all([
      submitHost.waitFor(),
      submitPlayerOne.waitFor(),
      submitPlayerTwo.waitFor(),
    ]);

    await Promise.all([
      selectCardsByLabels(hostPage, hostWinningHand),
      selectRandomCards(playerOnePage, 5),
      selectRandomCards(playerTwoPage, 5, true),
    ]);

    await Promise.all([
      submitHost.click(),
      submitPlayerOne.click(),
      submitPlayerTwo.click(),
    ]);

    if (round < roundCount) {
      await expect(
        hostPage.getByRole("heading", { name: "Round Summary" }),
      ).toBeVisible({ timeout: 20_000 });

      const nextRoundButton = hostPage.getByRole("button", {
        name: "Start Next Round",
      });
      await nextRoundButton.click();

      await expect(
        hostPage.getByText(`Round ${round + 1}`),
      ).toBeVisible({ timeout: 20_000 });
    }
  }

  await expect(
    hostPage.getByRole("heading", { name: "Winner" }),
  ).toBeVisible({ timeout: 30_000 });
  const winnerSection = hostPage.locator("section", {
    has: hostPage.getByRole("heading", { name: "Winner" }),
  });
  await expect(winnerSection.getByText(hostName).first()).toBeVisible();

  await Promise.all([
    hostContext.close(),
    playerOneContext.close(),
    playerTwoContext.close(),
  ]);

  if (hostVideo) {
    const path = await hostVideo.path();
    const target = join(videoDir, "host.webm");
    if (existsSync(target)) {
      rmSync(target);
    }
    renameSync(path, target);
  }
  if (playerOneVideo) {
    const path = await playerOneVideo.path();
    const target = join(videoDir, "player-one.webm");
    if (existsSync(target)) {
      rmSync(target);
    }
    renameSync(path, target);
  }
  if (playerTwoVideo) {
    const path = await playerTwoVideo.path();
    const target = join(videoDir, "player-two.webm");
    if (existsSync(target)) {
      rmSync(target);
    }
    renameSync(path, target);
  }
});
