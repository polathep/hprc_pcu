"""
สร้างไฟล์ข้อมูล data/data.js สำหรับ dashboard จากไฟล์ดิบ 3 ไฟล์ของ สวรส.

    EXP_PCU01_ถ่ายโอน.xlsx   (sheet PCU)        ข้อมูลหลักรายหน่วยบริการ
    EXP_PCU02_UC_OPPP.xlsx   (sheet UC_OPPP)    OP/PP สิทธิ UC ปีงบ 2563–2569
    EXP_PCU03_BUDGET.xlsx    (sheet PCU_BUDGET) เงินโอน สปสช. ปีงบ 2566–2569

วิธีใช้:
    pip install pandas openpyxl
    python scripts/build_data.py --input "path/to/raw-data-folder"

ผลลัพธ์: data/data.js (กำหนดตัวแปร window.PCU_DATA)
"""
import argparse
import json
import re
from pathlib import Path

import pandas as pd

FILE_PCU = "EXP_PCU01_ถ่ายโอน.xlsx"
FILE_UC = "EXP_PCU02_UC_OPPP.xlsx"
FILE_BUD = "EXP_PCU03_BUDGET.xlsx"

REGION_ORDER = ["ภาคเหนือ", "ภาคอีสาน", "ภาคกลาง", "ภาคตะวันออก", "ภาคใต้"]
# รุ่นถ่ายโอน: 0 ≤2565, 1 2566, 2 2567, 3 2568, 4 2569, 5 2570 (กำหนด), 6 ยังไม่ถ่ายโอน
COHORT = {"ถ่ายโอนปี2565ลงไป": 0, "ถ่ายโอนปี2566": 1, "ถ่ายโอนปี2567": 2, "ถ่ายโอนปี2568": 3,
          "ถ่ายโอนปี2569": 4, "ถ่ายโอนปี2570": 5, "ยังไม่ถ่ายโอน": 6}
AFFILIATION = ["อบจ.", "ทต.", "ทม.", "ทน.", "อบต.", "พิเศษ", "กสธ.", "ไม่ระบุ"]
SIZES = ["S", "M", "L", "ไม่ระบุ"]
GROUPS = ["รพสต.", "สอน.", "สสช."]
STAFF_COLS = ["ข้าราชการ", "ลูกจ้างประจำ", "พนักงานราชการ", "พกส", "ประเภทอื่น"]
YEARS_UC = ["Y2563", "Y2564", "Y2565", "Y2566", "Y2567", "Y2568", "Y2569"]
YEARS_B = ["Y2566", "Y2567", "Y2568", "Y2569"]
UC_VALS = ["POP_UC", "OP_Send", "OP_Adj", "PP_SEND", "PP_Adj"]
FUNDS = ["ผู้ป่วยนอก (OP)", "สร้างเสริมสุขภาพฯ (PP)", "งบลงทุน/ค่าเสื่อม", "แพทย์แผนไทย", "อื่นๆ ในระบบ UC", "นอกระบบ UC"]


def fund_group(main_code: int) -> int:
    """จัดกลุ่มกองทุนหลัก (mainfundcode) เป็น 6 กลุ่ม"""
    return {1: 0, 3: 1, 6: 2, 18: 3, 60: 5, 61: 5}.get(int(main_code), 4)


def short_name(name: str, code: str) -> str:
    return re.sub(r"^\s*" + re.escape(code) + r"\s*-\s*", "", name).strip()


def build(input_dir: Path) -> dict:
    pcu = pd.read_excel(input_dir / FILE_PCU, dtype={"PCU_CODE": str}).reset_index(drop=True)
    uc = pd.read_excel(input_dir / FILE_UC)
    bud = pd.read_excel(input_dir / FILE_BUD)
    pcu["PCU_CODE"] = pcu["PCU_CODE"].str.strip().str.zfill(5)

    # ---------- lookups ----------
    nhso = sorted(pcu.NHSO_NAME.unique())
    prov_tbl = (pcu.groupby("PROV_NAME")
                .agg(region=("Region", "first"), nhso=("NHSO_NAME", "first"))
                .reset_index().sort_values("PROV_NAME"))
    provs = [{"n": r.PROV_NAME, "r": REGION_ORDER.index(r.region), "h": nhso.index(r.nhso)} for r in prov_tbl.itertuples()]
    prov_i = {p["n"]: i for i, p in enumerate(provs)}
    amp_tbl = (pcu.groupby("AMP_CODE").agg(name=("AMP_NAME", "first"), prov=("PROV_NAME", "first"))
               .reset_index().sort_values(["prov", "name"]))
    amps = [{"n": r.name, "p": prov_i[r.prov]} for r in amp_tbl.itertuples()]
    amp_i = {c: i for i, c in enumerate(amp_tbl.AMP_CODE)}
    cups = sorted(pcu.CUP_NAME.unique()); cup_i = {c: i for i, c in enumerate(cups)}
    recvs = sorted(pcu["หน่วยรับถ่ายโอน"].unique()); recv_i = {c: i for i, c in enumerate(recvs)}
    lgos = sorted(pcu.LGO_NAME.dropna().unique()); lgo_i = {c: i for i, c in enumerate(lgos)}

    P = {
        "code": pcu.PCU_CODE.tolist(),
        "name": [short_name(n, c) for n, c in zip(pcu.PCU_NAME, pcu.PCU_CODE)],
        "amp": [amp_i[a] for a in pcu.AMP_CODE],
        "cup": [cup_i[c] for c in pcu.CUP_NAME],
        "coh": pcu["CHK_ถ่ายโอน"].map(COHORT).astype(int).tolist(),
        "yr": pcu["YEAR_ถ่ายโอน"].fillna(0).astype(int).tolist(),
        "aff": pcu["สังกัด_ปัจจุบัน"].fillna("ไม่ระบุ").map(AFFILIATION.index).tolist(),
        # ค่าขนาดที่ไม่ใช่ S/M/L (ว่าง, "K", "on") จัดเป็น "ไม่ระบุ"
        "size": pcu.PCU_SIZE.map(lambda v: v if v in ("S", "M", "L") else "ไม่ระบุ").map(SIZES.index).tolist(),
        "grp": pcu.PCU_GROUP.map(GROUPS.index).tolist(),
        "recv": [recv_i[r] for r in pcu["หน่วยรับถ่ายโอน"]],
        "lgo": pcu.LGO_NAME.map(lambda v: lgo_i.get(v, -1)).tolist(),
        "staff": pcu[STAFF_COLS].astype(int).values.tolist(),
    }
    code_pos = {c: i for i, c in enumerate(P["code"])}
    n = len(pcu)

    # ---------- UC OP/PP: ตัดแถวที่ไม่มีรหัสหน่วย รวมแถวซ้ำด้วย max ----------
    u = uc.dropna(subset=["PCU_CODE"]).copy()
    u["c"] = u.PCU_CODE.astype(int).astype(str).str.zfill(5)
    u = u.groupby(["c", "ปีงบ"])[UC_VALS].max().reset_index()
    uc_arr = [[None] * 35 for _ in range(n)]
    for r in u.itertuples(index=False):
        if r.c not in code_pos or r[1] not in YEARS_UC:
            continue
        i, y = code_pos[r.c], YEARS_UC.index(r[1])
        for k, col in enumerate(UC_VALS):
            x = getattr(r, col)
            uc_arr[i][y * 5 + k] = None if pd.isna(x) else int(round(x))

    # ---------- Budget: 6 กลุ่มกองทุน x 4 ปี ----------
    b = bud.copy()
    b["c"] = b.PCU_CODE.astype(int).astype(str).str.zfill(5)
    b["g"] = b.mainfundcode.map(fund_group)
    b = b[b["ปีงบ"].isin(YEARS_B) & b.c.isin(code_pos)]
    b["y"] = b["ปีงบ"].map(YEARS_B.index)
    agg = b.groupby(["c", "y", "g"])["เงินโอน"].sum().reset_index()
    b_arr = [[0] * 24 for _ in range(n)]
    for r in agg.itertuples(index=False):
        b_arr[code_pos[r.c]][r.y * 6 + r.g] = int(round(r.เงินโอน))
    in_bud = [0] * n
    for c in b.c.unique():
        in_bud[code_pos[c]] = 1
    other = b[b.g == 4].groupby("mainfundtname")["เงินโอน"].sum().sort_values(ascending=False)
    outside = b[b.g == 5].groupby("mainfundtname")["เงินโอน"].sum()

    return {
        "regions": REGION_ORDER, "nhso": nhso, "provs": provs, "amps": amps, "cups": cups, "recvs": recvs, "lgos": lgos,
        "aff": AFFILIATION, "sizes": SIZES, "groups": GROUPS, "funds": FUNDS,
        "yearsUC": [y[1:] for y in YEARS_UC], "yearsB": [y[1:] for y in YEARS_B],
        "staffTypes": ["ข้าราชการ", "ลูกจ้างประจำ", "พนักงานราชการ", "พกส.", "ประเภทอื่น"],
        "P": P,
        "uc": [v for row in uc_arr for v in row],
        "b": [v for row in b_arr for v in row],
        "inb": in_bud,
        "otherFunds": [[k, round(v / 1e6, 1)] for k, v in other.items()],
        "outFunds": [[k, round(v / 1e6, 1)] for k, v in outside.items()],
    }


def main():
    ap = argparse.ArgumentParser(description="สร้าง data/data.js จากไฟล์ดิบ สวรส.")
    ap.add_argument("--input", required=True, help="โฟลเดอร์ที่มีไฟล์ EXP_PCU01–03 (.xlsx)")
    ap.add_argument("--output", default=str(Path(__file__).resolve().parent.parent / "data" / "data.js"))
    a = ap.parse_args()
    data = build(Path(a.input))
    js = "window.PCU_DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    out = Path(a.output); out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(js, encoding="utf-8")
    print(f"เขียน {out} ({out.stat().st_size / 1e6:.1f} MB) · {len(data['P']['code']):,} หน่วยบริการ")


if __name__ == "__main__":
    main()
