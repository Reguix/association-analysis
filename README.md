## 关联分析模型

运用的关联分析方法有：基于规则的关联分析方法、基于统计的关联分析、基于数据挖掘的关联分析。

将多种日志以统一的json格式组织，该模型将分析所有日志，根据关联规则归并日志，生成日志图，划分出不同的事件，并利用社交网络发现等手段，对日志进行挖掘聚类，从而去除日志冗余信息，减小日志规模，并能够对感兴趣的事件中的有源事件（例如ppid->pid）进行回溯分析，对序列性事件进行排序梳理，有效提升了管理员的分析效率。

### 1.使用方法：
运行环境：**python3.7**

运行命令：**python main.py**

运行参数：

```
--log_dir: 存放日志文件的文件夹的路径，默认为log文件夹
--config : 存放关联关系表格的markdown文件路径，默认为association_table.md
--limit: 日志条目筛选值，默认为10，包含日志条目数小于等于此值的事件将被忽略
*******************其他参数（之后会去掉）****************
--pattern：生成模拟日志的模板文件，默认为pattern.json
--num_log：生成模拟日志条目的数量，默认为2000
```

所有依赖：

```
conda install --yes --file requirements.txt
为了生成pdf格式的报告，需额外安装wkhtmltox，并将安装路径添加到环境变量PATH
```

### 2. 日志格式：

  (1)日志文件名称：独一无二的名字，避免和其他日志文件名称重复，推荐：字符串+uuid4+".json"，比如panda_00b8ff3f-fcf4-4c6a-a625-12b77d6a31ef.json

  (2)日志格式：最外层是一个列表，列表的每一项是一条日志，即使只有一条日志，最外层也用列表包裹。每条日志都是字典类型，字典中又可以嵌套字典，比如下面的第一条字典日志中嵌套了字典string_tainted，嵌套的每个结构必须是字典形式。

  (3)日志字段类型：顶层字段和额外字段。顶层字段是所有日志都必须填充的字段，用来组织合并日志。额外字段是当前分析系统能提供的其他信息。目前来说，顶层字段完全一致的两条日志会被合并成一条日志。由于每条日志都包含了顶层字段，如果多条日志的某些顶层字段都是重复的，会造成日志的文件过大，可以自己定义格式和解析方法，添加到代码里面。为了避免不同分析系统的字段名称重复和冲突，所有字段汇总规范在一个association_table.md表格中，里面的顶层字段提供给每个分析系统来填充。
​     示例如下：

```json
[
   {
      "bits" : 32,
      "cr3" : 922783744,
      "curr_instr" : 443915339,
      "exe_path" : "/usr/lib/apache2/mpm-prefork/apache2",
      "os" : "linux",
      "pid" : 2305,
      "ppid" : 1969,
      "proc_name" : "apache2",
      "replay_percent" : 35.29812240600586,
      "string_tainted" : {
         "addr" : 3101813734,
         "pc" : 3076024214,
         "tainted_bytes" : 8,
         "tainted_string" : "seedelgg"
      },
      "timestamp" : 1555035444
   },
   {
      "bits" : 32,
      "cr3" : 922783744,
      "curr_instr" : 1178991843,
      "exe_path" : "/usr/lib/apache2/mpm-prefork/apache2",
      "os" : "linux",
      "pid" : 2305,
      "ppid" : 1969,
      "proc_name" : "apache2",
      "replay_percent" : 93.74805450439453,
      "tainted_out_net" : {
         "addr" : 2028097840,
         "label_string" : "10 ",
         "num_labels" : 1,
         "tainted_ram" : "g"
      },
      "timestamp" : 1555037330
   }
]
```

### 3.关联规则：

  (1)每个字段的含义需要描述清楚。

  (2)每个字段需要标明是希望用来组织日志的顶层字段，还是额外补充信息的额外字段。

  (3)每个字段关联关系，字段之间的关联关系如下：

```
(a)互斥字段，比如os，若两条日志的操作系统不一致，则两条日志完全无关

(b)直接相等字段，比如pid，再满足互斥字段相等的情况下，若两条日志的pid一致，则两个日志是有关联关系的

(c)交叉相等字段，比如两条日志的ppid和pid，构成一个(源-目的地) pair。

(d)其他更复杂的关联关系，需要详细的描述，其分析函数可由系统设计者添加
```

关联关系：

```
M: mutex 互斥      E: equal 直接相等      P: pair (源-目的地)   O: other 其他
```

值类型：

```
int    long   string   float    dict_key
```

字段类型

```
top: 顶层字段 希望所有系统都填充的，用来组织合并多条日志   extra: 补充字段，某个分析系统独有补充
```

默认值

```
string: NULL 代表为空字符串    int: NULL 代表0     long: NULL 代表0   float: NULL 代表0.0
```

上述日志中关联关系配置文件表格：

|      字段       | 类型  |  值类型  | 默认值 |   全部选项   |          含义          |   关系类型    | 关系描述 |
| :-------------: | :---: | :------: | :----: | :----------: | :--------------------: | :-----------: | -------- |
|       os        |  top  |  string  |  NULL  | window,linux |      操作系统类型      |       M       | NULL     |
|      bits       |  top  |   int    |  NULL  |    32,64     |      操作系统位数      |       M       | NULL     |
|       cr3       | extra |   long   |  NULL  |     NULL     |     cr3寄存器的值      |       E       | NULL     |
|       pid       |  top  |   int    |  NULL  |     NULL     |         进程id         | E,P(ppid-pid) | NULL     |
|      ppid       |  top  |   int    |  NULL  |     NULL     |        父进程id        | E,P(ppid-pid) | NULL     |
|    proc_name    |  top  |  string  |  NULL  |     NULL     |         进程名         |       E       | NULL     |
|    timestamp    |  top  |   long   |  NULL  |     NULL     |      时间戳（秒）      |       E       | NULL     |
|    exe_path     | extra |  string  |  NULL  |     NULL     |     可执行文件路径     |       E       | NULL     |
| replay_percent  | extra |  float   |  NULL  |     NULL     |       重放百分比       |       E       | NULL     |
| string_tainted  | extra | dict_key |  NULL  |     NULL     |     字符串污染事件     |       O       | NULL     |
|      addr       | extra |   long   |  NULL  |     NULL     |        内存地址        |       E       | NULL     |
|       pc        | extra |   long   |  NULL  |     NULL     |       程序计数器       |       E       | NULL     |
| tainted_string  | extra |  string  |  NULL  |     NULL     |     被污染的字符串     |       E       | NULL     |
|  tainted_bytes  | extra |   int    |  NULL  |     NULL     |     被污染的字节数     |       O       | NULL     |
|   curr_instr    | extra |   long   |  NULL  |     NULL     |       当前指令数       |       E       | NULL     |
|   tainted_ram   | extra |  string  |  NULL  |     NULL     | 传出网络的带污点的字节 |       O       | NULL     |
|   num_labels    | extra |   int    |  NULL  |     NULL     |       污点标签数       |       O       | NULL     |
|  label_string   | extra |  string  |  NULL  |     NULL     |     污点标签字符串     |       O       | NULL     |
| tainted_out_net | extra | dict_key |  NULL  |     NULL     |  污点数据传出网络事件  |       O       | NULL     |

添加新的关联关系：

- 关联关系表格保存在文件association_table.md中，要想添加新的字段和关联关系，可以按照上述格式向其中添加行；
- 添加的字段名称，尽量用小写字母+下划线表示，大写字母也可以，但不要出现"E","O","P","M";
- 关联类型中，可能有多种关联关系，用逗号分隔，如E,P(ppid-pid)；
- 关联关系中，pair类型的要用P开头表示，用英文括号()包裹，并用**-**分隔，如果是指向性的pair，源要放在前面，也可添加多个交叉，例如P(ppid-pid)(a-b-pid)
- 注意不要添加已使用的字段名称，避免名称重复。含义一致的字段使用相同的名称，不要额外另起名字。

 

### 4.关于时间字段

  时间统一格式，从UTC1970-1-1 0:0:0开始计时到当前时间的秒数。qemu在加载虚拟机的时候可以指定虚拟机的内的时间  -rtc base=2009-01-01T16:00:21 所以虚拟机内的绝对时间是没有意义的，所以日志里面的时间戳只能用来标识日志的之间相对时间，但由于秒的精度不够，会有多条日志的时间戳相等的情况出现。

