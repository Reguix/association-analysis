# -*- coding: utf-8 -*-
#!/usr/bin/env python
"""
Created on Thu Mar 28 19:02:40 2019
关联分析模型(隐私计算分析取证)
运用的关联分析方法有：基于规则的关联分析方法、基于统计的关联分析、基于数据挖掘的关联分析

"""
import json
import copy
import graphviz
import pydot
import random
import time
import os
import sys
import re
import uuid
import sqlite3
import hashlib
import send2trash
import argparse
import shutil
import community
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import math
import pdfkit
import pandas as pd
from igraph import *
from collections import OrderedDict
import networkx as nx
from multiprocessing import Pool
from functools import partial

 
# 生成海量模拟日志
def genHugeLog(patternJsonFilePath, logFileDirPath, numOfLog):
    """
    模拟日志格式
    {
        "os": "",
        "time": "",
        "pid": "",
        "ppid" "",
        "network": {
            "local_ip": "",
            "foreign_ip": ""
        }
    }
    """
    osTypeList = ["windows", "centos", "ubuntu", "redhat"]
    ipList = ["111.111.111.111", "222.222.222.222", "233.233.233.233", 
              "234.234.234.234", "235.235.235.235", "236.236.236.236"]
    
    with open(patternJsonFilePath, "r") as patternJsonFile:
        pattern = json.load(patternJsonFile, object_pairs_hook=OrderedDict)
    # print(type(pattern))
    # print(pattern)
    
    logDictList = list()
    
    for index in range(numOfLog):
        logDict = copy.deepcopy(pattern)
        # print(pattern)
        logDict["os"] = osTypeList[random.randint(0, len(osTypeList) - 1)]
        logDict["time"] = random.randint(0, 5 * numOfLog)
        logDict["ppid"] = random.randint(5000, 5000 + numOfLog / 20)
        logDict["pid"] = random.randint(logDict["ppid"], 7000 + numOfLog / 20)
        # while logDict["ppid"] >= logDict["pid"]:
            # logDict["ppid"] = random.randint(5000, 5000 + numOfLog / 25)
        # print(ipList)
        if (index % 50 == 0):
            tmpIpList = copy.deepcopy(ipList)
            # print(tmpIpList)
            logDict["network"]["local_ip"] = tmpIpList[random.randint(0, (len(tmpIpList) - 1))]
            # print(logDict["network"]["local_ip"])
            tmpIpList.remove(logDict["network"]["local_ip"])
            logDict["network"]["foreign_ip"] = tmpIpList[random.randint(0, (len(tmpIpList) - 1))]
        logDictList.append(logDict)
        
    
    logFilePath = os.path.join(logFileDirPath, str(uuid.uuid4()) + ".json")    
    with open(logFilePath, "w") as logFile:
        json.dump(logDictList, logFile, sort_keys=False, indent=4, separators=(',', ':'))

            
# 定义关联规则（基于规则的关联分析）
def isConnect(logDictA, logDictB):
    """
    定义关联规则，互斥的字段直接判断无连接，然后递归遍历判断相等字段
    之后可以定义更复杂的规则，只有当两条日志间的关联程度足够强才连接两个节点
    """
    # 互斥字段（顶层字段，所有日志都必须填充的字段）
    mutexKeyList = ["os"]
    # 直接相等字段（最底层的键）
    equalKeyList = ["time","pid", "ppid", "local_ip","foreign_ip"]
    # 交叉相等字段
    crossEqualTupleList = [("ppid", "pid")]
    
    # TODO: 这里添加更多复杂关联
    
    # 首先处理互斥字段
    for key in mutexKeyList:
        if key in logDictA.keys() and key in logDictB.keys():
            if logDictA[key] != logDictB[key]:
                return False
    
    for key in logDictA.keys():
        # 处理嵌套的字典
        if isinstance(logDictA[key], dict) and key in logDictB.keys():
            if(isConnect(logDictA[key], logDictB[key])):
                return True
        elif key in equalKeyList:
            # 处理直接相等字段
            if key in logDictA.keys() and key in logDictB.keys():
                if logDictA[key] == logDictB[key] and logDictA[key] != "":
                    return True
        else:
            # 处理交叉相等字段
            for tupleItem in crossEqualTupleList:
                if key in tupleItem:
                    for item in tupleItem:
                        if item in logDictB.keys() and item != key:
                            if logDictA[key] == logDictB[item] and logDictA[key] != "":
                                return True
    return False

 
# 生成日志图
def genLogGraphFromLogDir(logFileDirPath):
    
    print("初始化日志图信息")

    defaultColor = {"color": {"r": 30, "g": 144, "b": 255, "a": 0}}
    graphGexfFilePath = "logGraph.gexf"
    graphFigFilePath = "logGraph.jpg"
    
    graph = nx.Graph()
    
    for root, dirs, files in os.walk(logFileDirPath):
        for file in files:
            if file.endswith(".json"):
                logFilePath = os.path.join(root, file)
                with open(logFilePath, "r") as logFile:
                    logDictList = json.load(logFile)
                    for logDict in logDictList:
                        logStr = json.dumps(logDict)
                        logLabel = str(uuid.uuid4())
                        graph.add_node(logLabel)
                        graph.nodes[logLabel]["viz"] = defaultColor
                        graph.nodes[logLabel]["logStr"] = logStr
    
    for i, nodeA in enumerate(list(graph.nodes)):
        for nodeB in list(graph.nodes)[(i + 1):]:
            # print("A: %s, B: %s" % (graph.nodes[nodeA], graph.nodes[nodeB]))
            logDictA = json.loads(graph.nodes[nodeA]["logStr"])
            logDictB = json.loads(graph.nodes[nodeB]["logStr"])
            if(isConnect(logDictA, logDictB)):
                graph.add_edge(nodeA, nodeB)
    nx.write_gexf(graph, graphGexfFilePath)
    
    #print("Generate log graph done!")
    print("原始日志图包含节点数（日志条目数）: %s" % graph.number_of_nodes())
    print("原始日志图包含边数: %s" % graph.number_of_edges())
    print("原始日志图静态图: ")
    print('<img src="./logGraph.jpg" alt="原始日志图静态图" />')
    network_draw(graph, graphFigFilePath)
    print('<a href="./graphView/index.html" target="_blank">点击查看原始日志动态图</a> 包含了全部日志信息。')
    
    return graph
    

# 日志图连通性过滤
def connectedFilter(graph, limit=10):
    """
    分离出完全不相关的事件，过滤掉包含日志数目为1个或较少的事件（可设置更加复杂的过滤条件）
    """
    print("连通性分析信息")
    # "wccsg" means "weakly connected component subgraph"
    wccsgList = sorted(nx.connected_component_subgraphs(graph), 
                       key=len, reverse=True)
    wccsgLenList = [len(subgraph) for subgraph in wccsgList]
    print("根据连通性划分得到不相关的安全事件数: %s" % len(wccsgLenList))
    print("每个安全事件中包含的日志条目数列表如下: ")
    print(wccsgLenList)
    
    # 生成日志图事件概述(基于统计的关联分析)
    print("事件中日志条目统计结果: ")
    describe(wccsgLenList)
    
    print("事件中日志条目统计图表: ")
    print('<img src="./statistics.jpg" alt="事件中日志条目统计" />')
    histAndBoxPlot(wccsgLenList, "事件中包含的日志条目", "statistics.jpg")
    
    # 过滤掉包含日志较少的事件（可以定义更复杂的筛选）
    remainList = [graph for graph in wccsgList if len(graph) > limit]
    removeList = [graph for graph in wccsgList if len(graph) <= limit]
    
    connectedFilterGraph = copy.deepcopy(graph)
    
    for g in removeList:
        connectedFilterGraph.remove_nodes_from(g.nodes)
    
    # 为不同的事件图着色
    newColor = {"color": {"r": 30, "g": 144, "b": 255, "a": 0}}
    usedColor = [str(newColor)]
    for g in remainList:
        while str(newColor) in usedColor:
            newColor = randomColor()
        usedColor.append(str(newColor))
        for node in g.nodes:
            connectedFilterGraph.nodes[node]["viz"] = newColor
    
    nx.write_gexf(connectedFilterGraph, "connectedFilterGraph.gexf")
    print("初步过滤信息 ")
    print("日志图包含节点数（日志条目数）: %s" % connectedFilterGraph.number_of_nodes())
    print("日志图包含边数: %s" % connectedFilterGraph.number_of_nodes())
    print("日志规模下降为原来的: %.2f%%!" % (connectedFilterGraph.number_of_nodes() / graph.number_of_nodes() * 100))
    
    print("连通性过滤后的日志静态图: ")
    print('<img src="./connectedFilterGraph.jpg" alt="连通性过滤后的日志静态图" />')
    network_draw(connectedFilterGraph, "connectedFilterGraph.jpg")
    print("注: 不同的事件以不同的颜色标明")
    print('<a href="./graphView/index.html" target="_blank">点击查看过滤后的日志动态图</a> 包含了全部事件信息。')
    
    return connectedFilterGraph, remainList


# 日志图社区检测过滤(基于数据挖掘的关联分析)
def communityFilter(connectedFilterGraph, subgraphList):
    """
    较大事件进行社区聚类分析，进一步划分事件，减小事件规模
    """
    print("社区检测信息")
    communityFilterGraph = copy.deepcopy(connectedFilterGraph)
    comsgLists, comsgLenLists= list(), list()
    
    # 对较大的事件进行社区检测，并进行渐变色着色，社区越大颜色越明亮
    for i, g in enumerate(subgraphList):
        comsgList, comsgLenList = communityDetect(g)
        comsgLists.append(comsgList)
        comsgLenLists.append(comsgLenList)
        curColor = copy.deepcopy(communityFilterGraph.nodes[list(g.nodes)[0]]["viz"])
        for j, comsg in enumerate(list(reversed(comsgList))):
            if len(comsgList) == 1:
                continue
            newColor = brighterColor(curColor, len(comsgList) - j)
            for node in comsg.nodes:
                communityFilterGraph.nodes[node]["viz"] = copy.deepcopy(newColor)
            gexfFilePath = "./event/event" + str(i) + "_"+ str(len(comsgList) - j - 1) + ".gexf"
            nx.write_gexf(communityFilterGraph.subgraph(comsg.nodes), gexfFilePath)
        gexfFilePath = "./event/event" + str(i) + ".gexf"
        nx.write_gexf(communityFilterGraph.subgraph(g.nodes), gexfFilePath)
    nx.write_gexf(communityFilterGraph, "communityFilterGraph.gexf")
    
    # TODO:也可以对过小的社区进行过滤
    
    print("每个安全事件中包含的日志条目数列表如下（嵌套表示）:")
    print(comsgLenLists)
    
    print("社区检测后的事件日志静态图（单个事件为例）: ")
    print('<img src="./communityFilterGraph.jpg" alt="社区检测后的事件日志静态图" />')
    network_draw(communityFilterGraph.subgraph(subgraphList[0]), "communityFilterGraph.jpg")
    print("注: 单个事件划分为多个社区，社区内包含的日志条目越多颜色越明亮")
    print('<a href="./graphView/index.html" target="_blank">点击查看社区检测日志动态图</a> 包含了全部社区信息。')
    
    return communityFilterGraph, comsgLists
    
def communityDetect(graph):
    # "comsg" means "community Subgraph"
    comsgList = list()
    # partitionDict : {nodeId : communityId}
    partitionDict = partitionDict = community.best_partition(graph)
    numOfCom = len(set(partitionDict.values()))
    for comId in range(numOfCom):
        comNodesList = [node for node in partitionDict.keys() 
                            if partitionDict[node] == comId]
        comsg = graph.subgraph(comNodesList).copy()
        comsgList.append(comsg)
    comsgList = sorted(comsgList, key=len, reverse=True)
    comsgLenList = [len(subgraph) for subgraph in comsgList]
    return comsgList, comsgLenList


# 溯源分析(源-->目的地,树形追溯)
def backtrace(item, eventGraph):
    """
    item是一个二元组类型 (sourceKey, destKey)
    将要分析的事件的图和要回溯分析的关键词传进来就可以分析了，比如(ppid, pid)
    """
    DG = nx.DiGraph()
    for node in eventGraph.nodes:
        logDict = json.loads(eventGraph.nodes[node]["logStr"])
        src = logDict[item[0]]
        dest = logDict[item[1]]
        if src == dest:
            continue
        if (src in DG.nodes and dest in DG.nodes):
            continue
        if dest in DG.nodes:
            if DG.in_degree(dest) != 0:
                continue
        DG.add_edge(src, dest)
    
    # wccsgList = sorted(nx.weakly_connected_component_subgraphs(DG), key=len, reverse=True)
    # plt.figure()
    # pos = nx.nx_pydot.graphviz_layout(wccsgList[0], prog='dot')
    # nx.draw(DG, pos=pos, with_labels=True)
    # plt.savefig("tree.jpg")
    
    dot = nx.nx_pydot.to_pydot(DG)
    print('<img src="./backtrace.jpg" alt="回溯分析静态图" />')
    dot.write_jpeg("backtrace.jpg")
    print("注:图中标明了回溯对象的值")
    print('<a href="./graphView/index.html" target="_blank">点击查看回溯分析动态图</a> 包含了全部信息。')
    nx.write_gexf(DG, "backtrace.gexf")
        
# 序列性事件分析 （比如时间序列，进行排序，事件间隔过大的断开连接）
def seriesAnalysis(seriesKey, eventGraph):
    """
    seriesKey是序列性数据的键，目前就是将事件的日志排序输出到表格
    """
    tupleList = list()
    for node in eventGraph.nodes:
        logStr = eventGraph.nodes[node]["logStr"]
        logDict = json.loads(logStr)
        seriesData = logDict[seriesKey]
        tupleList.append((seriesData, logStr)) 
    
    tupleList.sort()
    logStrList = [logStr for (seriesData, logStr) in tupleList]
    seriesDataList = [seriesData for (seriesData, logStr) in tupleList]
    
    dataDict = {seriesKey: seriesDataList,
                "日志": logStrList}
    df = pd.DataFrame(dataDict)
    df.to_csv("seriesAnalysis.csv", encoding="utf_8")
    
    old_width = pd.get_option("display.max_colwidth")
    pd.set_option("display.max_colwidth", -1)
    # df.to_html("seriesAnalysis.html",escape=False,index=False,sparsify=True,border=0,index_names=False,header=False)
    df.to_html("seriesAnalysis.html")
    pd.set_option("display.max_colwidth", old_width)
    
    print("insert html seriesAnalysis.html")
    # print(df)
    
    

# 僵尸ip分析(基于规则的关联分析)
def botIpAttack(eventGraph):
    pass


# 生成关联分析报告
def report():
    sys.stdout.flush()
    parserTxtToHtml()
    parserHtmlToPdf()
    
# 工具函数
def cleanDir(dirPath, preservationFileList=[], toTrash=True):
    for fileName in os.listdir(dirPath):
        if fileName not in preservationFileList:
            filePath = os.path.join(dirPath, fileName)
            if toTrash:
                send2trash.send2trash(filePath)
            else:
                if os.path.isfile(filePath):
                    os.unlink(filePath)
                if os.path.isdir(filePath):
                    shutil.rmtree(filePath)

def randomColor():
    color = {"color": {"r": 30, "g": 144, "b": 255, "a": 0}}
    color["color"]["r"] = random.randint(0, 155)
    color["color"]["g"] = random.randint(0, 155)
    color["color"]["b"] = random.randint(0, 155)
    return color

def brighterColor(color, increment):
    colorList = list(color["color"].values())
    max_color , max_index = 0, 0
    for i, c in enumerate(colorList):
        if (c > max_color):
            max_index = i
            max_color = c
    max_color = max_color + int((255 - max_color) / increment)
    color["color"][list(color["color"].keys())[max_index]] = max_color
    return color
        

def convertToIgraph():
    pass


def histAndBoxPlot(dataList, dataLabel, figFilePath):
    plt.rcParams['font.sans-serif']=['SimHei']
    data = np.array(dataList)
    fig = plt.figure(figsize =(9,5))
    
    # boxplot 
    axBoxplot = fig.add_subplot(1,2,1)
    axBoxplot.set_ylabel(dataLabel)
    axBoxplot.yaxis.set_major_locator(ticker.MultipleLocator(int(max(data) / 15)))
    axBoxplot.set_title("箱型图")
    axBoxplot.boxplot(data,sym='o',whis=1.5, showmeans=True)
    
    # hist
    axhist = fig.add_subplot(1,2,2)
    axhist.set_xlabel(dataLabel)
    axhist.xaxis.set_major_locator(ticker.MultipleLocator(int(max(data) / 10)))
    axhist.set_ylabel("频数")
    axhist.set_title("直方图")
    axhist.hist(data,bins=40, density=0, facecolor="blue", edgecolor="black", alpha=0.7)
    
    fig.tight_layout()
    
    #figurePdfFilePath = dataLabel + ".jpg"
    plt.savefig(figFilePath)
    # plt.show()

def describe(dataList,labels=""):
    pd.set_option('precision', 0)
    pd.set_option('display.unicode.ambiguous_as_wide', True)
    pd.set_option('display.unicode.east_asian_width', True)
    # dataLists, labels = list(), list()
    # dataLists.append(dataList)
    # labels.append(label)
    # dataFrame = pd.DataFrame(dataLists)
    # dataFrame = dataFrame.T
    # statisticsDataFrame = dataFrame.describe()
    # statisticsDataFrame.columns = labels
    s = pd.Series(dataList)
    statisticsSeries = s.describe()
    # statisticsDataFrame.round(2)
    index = ["参与统计: ","平均值: ","标准差: ","最小值: ","25%: ","50%: ","75%: ","最大值: "]
    statisticsDataFrame= pd.Series(statisticsSeries.values, index=index)
    print(statisticsDataFrame)


def parserTxtToHtml():
    htmlHead = ('<!Doctype html><html><head><title>关联分析报告</title><meta charset="utf8" /></head><body>'
                "<h1>关联分析报告</h1>")
    htmlTail = ("</body></html>")
    with open("report.html", "w", encoding="utf-8") as htmlFile:
        htmlFile.write(htmlHead)
        txtFile = open("report.txt", "r", encoding="utf-8")
        lines = txtFile.readlines()
        for line in lines:
            if "dtype" in line:
                continue
            if ":" in line or "[" in line or "<" in line:
                newLine = "<p>" + line + "</p>"
            elif "insert" not in line:
                newLine = "<h2>" + line + "</h2>"
            else:
                with open(line.strip().split(" ")[-1], "r") as insertFile:
                    newLine = "".join(insertFile.readlines())
                    newLine = "<p>" + newLine + "</p>"
            htmlFile.write(newLine)
        htmlFile.write(htmlTail)

def parserHtmlToPdf():
    # confg = pdfkit.configuration(wkhtmltopdf="D:\\wkhtmltox\\bin\\wkhtmltopdf.exe")
    pdfkit.from_file("report.html", 'report.pdf')
    

class Logger(object):
    def __init__(self, filename="report.txt"):
        self.terminal = sys.stdout
        self.log = open(filename, "a", encoding="utf-8")
 
    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)
 
    def flush(self):
        self.log.flush()
    
    def close(self):
        self.log.close()

def network_draw(graph, saveFigPath):
    plt.figure()
    node_color = list()
    
    for node in graph.nodes:
        color = [30 / 255, 144 / 255, 255 / 255]
        color[0] = graph.nodes[node]["viz"]["color"]["r"] / 255
        color[1] = graph.nodes[node]["viz"]["color"]["g"] / 255
        color[2] = graph.nodes[node]["viz"]["color"]["b"] / 255
        node_color.append(color)
    
    pos = nx.kamada_kawai_layout(graph)  
    nx.draw(graph, pos=pos, node_color=node_color, node_size = 60, edge_color="gray", with_labels=False)
    plt.savefig(saveFigPath)

def notBool(b):
    return bool(1-b)

# 主函数
def main(pattern, log_dir, num_log, limit):
    
    # 清理当前目录，新建event目录保存分析结果 
    # ignoreFileList = ["main.py","funcTest.py", "graphView", "test.json", pattern, "log"]
    cleanDir("./event", toTrash=False)
    # os.mkdir("event") 
    
    # 重定向输出
    sys.stdout = Logger()
    
    #清理上次生成的模拟日志，并生成新的模拟日志
    cleanDir(log_dir,toTrash=False)
    genHugeLog(pattern, log_dir, num_log)
    
    # 生成日志图
    graph = genLogGraphFromLogDir(log_dir)
    
    # 联通性分析
    connectedGraph, subgraphList = connectedFilter(graph, limit)
    
    # 社区检测
    communityFilterGraph, comsgLists = communityFilter(connectedGraph, subgraphList)
    
    # 溯源分析示例（进程树）
    print("回溯分析示例")
    print("以父子进程(ppid, pid)为例进行回溯分析: ")
    eventGraph = nx.read_gexf("./event/event0_0.gexf")
    backtrace(("ppid", "pid"), eventGraph)
    
    # 序列性分析示例（时间序列）
    print("序列性数据分析示例")
    print("以时间（time）为例进行序列性分析:")
    eventGraph = nx.read_gexf("./event/event0_0.gexf")
    seriesAnalysis("time", eventGraph)
    
    # 生成html和pdf报告
    report()
    
    # sys.stdout.close()

       
if __name__ == "__main__":
    argparser = argparse.ArgumentParser()
    argparser.add_argument("--pattern", type=str, default="pattern.json")
    argparser.add_argument("--log_dir", type=str, default="./log")
    argparser.add_argument("--num_log", type=int, default=2000)
    argparser.add_argument("--limit", type=int, default=10)
    args = argparser.parse_args()
    # print(vars(args))
    
    main(**vars(args))