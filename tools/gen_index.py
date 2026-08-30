#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re, sys

SRC = r"D:/ZM/修炼手札/tools/il2cpp_output/dump.cs"
OUT = r"D:/ZM/修炼手札/tools/il2cpp_output/游戏自有类导航索引.txt"

# 只收录全局命名空间(无 namespace) 且 TypeDefIndex 在游戏自研区段的类型
GAME_MIN, GAME_MAX = 5000, 5200

with open(SRC, "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()

# 按 // Namespace: 切分成“块”，每块第一个 public 类型声明即该块主类型
blocks = []  # list of (ns, [lines])
cur_ns = None
cur_block = None
for ln in lines:
    m = re.match(r'^// Namespace: (.*)$', ln)
    if m:
        if cur_block is not None:
            blocks.append((cur_ns, cur_block))
        cur_ns = m.group(1).strip()
        cur_block = [ln]
    else:
        if cur_block is not None:
            cur_block.append(ln)
if cur_block is not None:
    blocks.append((cur_ns, cur_block))

def parse_typedef(block_lines):
    for l in block_lines:
        m = re.search(r'TypeDefIndex: (\d+)', l)
        if m:
            return int(m.group(1))
    return None

def parse_decl(block_lines):
    for l in block_lines:
        m = re.match(r'^(public (?:sealed |abstract |static )?(?:class|struct|interface|enum)[\s\S]*?)(?=// TypeDefIndex)', l)
        if m:
            return m.group(1).strip()
    return None

results = []
for ns, blk in blocks:
    if ns != "":  # 只取全局命名空间
        continue
    decl = parse_decl(blk)
    if not decl:
        continue
    tid = parse_typedef(blk)
    if tid is None or not (GAME_MIN <= tid <= GAME_MAX):
        continue
    # 提取字段: 形如 “\tpublic int foo; // 0x10” 或 “\tpublic List<int> bar; // 0x20”
    fields = []
    methods = []
    props = []
    section = None
    for l in blk:
        s = l.rstrip("\n")
        if re.match(r'^\t// (Fields|Methods|Properties|Nested types|Events)', s):
            section = s.strip().strip('/').strip()
            continue
        if section == "Fields":
            fm = re.match(r'^\t(?:public|private|internal|protected)(?: static)?\s+([\w\.<>\[\],\s]+?)\s+(\w+)\s*;', s)
            if fm:
                fields.append((fm.group(2), fm.group(1).strip()))
        elif section == "Methods":
            mm = re.match(r'^\t(?:public|private|internal|protected)(?: static| override| virtual| sealed| new)?\s+([\w\.<>\[\],\s]+?)\s+(\w+)\s*\(([^)]*)\)', s)
            if mm:
                methods.append((mm.group(2), mm.group(1).strip(), mm.group(3).strip()))
        elif section == "Properties":
            pm = re.match(r'^\t(?:public|private|internal|protected)(?: static)?\s+([\w\.<>\[\],\s]+?)\s+(\w+)\s*\{', s)
            if pm:
                props.append((pm.group(2), pm.group(1).strip()))
    results.append((tid, decl, fields, methods, props))

results.sort(key=lambda x: x[0])

with open(OUT, "w", encoding="utf-8") as out:
    out.write("游戏自有类导航索引（来自 Il2CppDumper 还原的 dump.cs）\n")
    out.write("本文件仅含全局命名空间、TypeDefIndex 在 %d-%d 的自研类。\n" % (GAME_MIN, GAME_MAX))
    out.write("说明：IL2CPP 只能还原“类名/字段/方法签名”，方法体内具体逻辑看不到（需 Ghidra/IDA 分析 libil2cpp.so）。\n")
    out.write("dump.cs 总行数 %d，本索引只挑出开发者自己写的类。\n\n" % len(lines))
    for tid, decl, fields, methods, props in results:
        out.write("─" * 70 + "\n")
        out.write("[%d] %s\n" % (tid, decl))
        if fields:
            out.write("  · 字段(%d):\n" % len(fields))
            for nm, ty in fields:
                out.write("      %s : %s\n" % (nm, ty))
        if props:
            out.write("  · 属性(%d):\n" % len(props))
            for nm, ty in props:
                out.write("      %s : %s\n" % (nm, ty))
        if methods:
            out.write("  · 方法(%d):\n" % len(methods))
            for nm, ty, args in methods:
                out.write("      %s %s(%s)\n" % (ty, nm, args))
        out.write("\n")

print("已生成索引，收录自研类型 %d 个" % len(results))
