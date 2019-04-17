# -*- coding: utf-8 -*-
"""
Created on Fri Apr 12 15:37:29 2019

"""
import os
import re


def parser_table(tableFilePath):
    associationDict = dict()
    defaultValueDict = dict()
    mutexKeySet = set()
    equalKeySet = set()
    crossEqualTupleSet = set()
    topKeyList = list()
    extraKeyList = list()
    tableFile = open(tableFilePath, "r", encoding="utf-8")
    lines = tableFile.readlines()
    for line in lines[2:]:
        keyList = line.strip().replace(" ", "")[1:-1].split("|")
        key, keyTpye, associationStr = keyList[0], keyList[1], keyList[6]
        valueTpye, defaultValue = keyList[2], keyList[3] 
        if defaultValue == "NULL":
            if valueTpye == "string":
                defaultValue = ""
            elif valueTpye == "int":
                defaultValue = 0
            elif valueTpye == "long":
                defaultValue = 0
            elif valueTpye == "float":
                defaultValue = 0
        
        defaultValueDict[key] = defaultValue
        
        if keyTpye == "top":
            topKeyList.append(key)
        if keyTpye == "extra":
            extraKeyList.append(key)
        
        # print(associationStr)
        if "M" in associationStr:
            mutexKeySet.add(key)
        if "E" in associationStr:
            equalKeySet.add(key)
        if "P" in associationStr:
            matcherList = re.findall(r"\(.*?\)", associationStr)
            for matcher in matcherList:
                crossEqualTupleSet.add(tuple(matcher[1:-1].split("-")))
    
    tableFile.close()
    associationDict["defaultValueDict"] = defaultValueDict
    associationDict["topKeyList"] = topKeyList
    associationDict["extraKeyList"] = extraKeyList
    associationDict["mutexKeyList"] = list(mutexKeySet)
    associationDict["equalKeyList"] = list(equalKeySet)
    associationDict["crossEqualTupleList"] = list(crossEqualTupleSet)
    
    # print(associationDict)
    return associationDict

if __name__ == "__main__":
    parser_table("association_table.md")