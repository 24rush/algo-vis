
export enum LangEnum {
    Ro,
    En
}

var en_langMap : Record<number, string> = {
    0: "Global scope",
    1: "Run all",
    2: "Pause",
    3: "Show comments",
    4: "Execute line",
    5: "Compilation error",
    6: "Restart",
    7: "Variables",
    8: "Console output",
    9: "reference to ",
    10: "function ",
    11: "local scope in",
    12: "local scope",
    13: "Playback speed",
    14: "Sloow",
    15: "Slow",
    16: "Realtime",
    17: "Exception",
    18: "OK",
    19: "Cancel",
    20: "Insert a value"
}

var ro_langMap : Record<number, string> = {
    0: "Scop global",
    1: "Ruleaza",
    2: "Pauza",
    3: "Arata comentarii",
    4: "Executa linie",
    5: "Eroare compilare",
    6: "Revenire",
    7: "Variabile",
    8: "Consola de iesire",
    9: "refera pe ",
    10: "functia ",
    11: "scop local in ",
    12: "scop local",
    13: "Viteza executie",
    14: "Inceet",
    15: "Incet",
    16: "Fara delay",
    17: "Exceptie",
    18: "OK",
    19: "Anuleaza",
    20: "Introdu o valoare"
}

export class Localize
{
    private static currentLang : LangEnum = LangEnum.Ro;
    private static languageMap : Record<number, string> = undefined;

    public static setLang(lang: LangEnum) { 
        this.languageMap = lang == LangEnum.En ? en_langMap : ro_langMap;
        this.currentLang = lang;
    }

    public static getLangStr() {
        switch (this.currentLang) {
            case LangEnum.En:
                return "en"
            case LangEnum.Ro:
                return "ro"                        
            default:
                throw "Language not set";
        }
    }

    public static str(strId: number) : string {        
        if (!Localize.languageMap || !(strId in Localize.languageMap))
            throw ("Cannot translate string with id: " + strId);

        return Localize.languageMap[strId];
    }
}