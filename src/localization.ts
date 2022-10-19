
export enum LangEnum {
    Ro,
    En
}

var en_langMap : Record<number, string> = {
    0: "Global scope",
    1: "Exec all",
    2: "Pause",
    3: "Show comments",
    4: "Execute line",
    5: "Compilation",
    6: "Restart",
    7: "Variables",
    8: "Console output",
    9: "reference to"
}

var ro_langMap : Record<number, string> = {
    0: "Scop global",
    1: "Executa tot",
    2: "Pauza",
    3: "Arata comentarii",
    4: "Executa o linie",
    5: "Compilare",
    6: "Reincepe",
    7: "Variabile",
    8: "Consola de iesire",
    9: "referinta la"
}

export class Localize
{
    private static languageMap : Record<number, string> = undefined;

    public static setLang(lang: LangEnum) { 
        this.languageMap = lang == LangEnum.En ? en_langMap : ro_langMap;
    }

    public static str(strId: number) : string {        
        if (!Localize.languageMap || !(strId in Localize.languageMap))
            throw ("Cannot translate string with id: " + strId);

        return Localize.languageMap[strId];
    }
}