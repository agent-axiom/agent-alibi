import { describe, expect, it } from "vitest";
import { localizeText, t } from "./i18n";

describe("rival intel localization", () => {
  it("translates rival intel labels and dynamic intent text", () => {
    expect(t("zh", "match.rivalIntel")).toBe("对手情报");
    expect(localizeText("ru", "Hunter")).toBe("Охотник");
    expect(localizeText("ru", "Waking in 7s · 51m")).toBe("Пробуждение через 7с · 51м");
    expect(localizeText("ru", "Greed route armed")).toBe("Маршрут жадности готов");
    expect(localizeText("ru", "Cashout +8 if you survive")).toBe("Сдача +8, если выживете");
    expect(localizeText("ru", "Bank +5 at Atrium Lift")).toBe("Сдать +5 на Лифте Атриума");
    expect(localizeText("zh", "Raiding Silver Archive")).toBe("突袭银档案室");
    expect(localizeText("zh", "Cashout route armed")).toBe("结算路线已就绪");
    expect(localizeText("zh", "Bank +5 at Atrium Lift")).toBe("在中庭升降梯存入 +5");
    expect(localizeText("zh", "Jam or break line")).toBe("干扰或摆脱视线");
  });
});
