
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
    20: "Insert a value",
    21: "Next",
    22: "Check",
    23: "Show explanation",
    24: "Back to statement",
    25: "Finish",
    26: "Show solution",
    27: "Hide solution"
}

var ro_langMap : Record<number, string> = {
    0: "Scop global",
    1: "Rulează tot",
    2: "Pauză",
    3: "Arată comentarii",
    4: "Execută linie",
    5: "Eroare compilare",
    6: "De la început",
    7: "Variabile",
    8: "Consolă de ieșire",
    9: "referă pe ",
    10: "funcția ",
    11: "scop local în ",
    12: "scop local",
    13: "Viteză execuție",
    14: "Mai înceet",
    15: "Încet",
    16: "Fără delay",
    17: "Excepție",
    18: "OK",
    19: "Anulează",
    20: "Introdu o valoare",
    21: "Următoarea",
    22: "Verifică",
    23: "Arată explicație",
    24: "Înapoi la întrebare",
    25: "Închide",
    26: "Arată soluție",
    27: "Ascunde soluție"
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