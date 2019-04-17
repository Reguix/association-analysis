|      字段       | 类型  |  值类型  | 默认值 |   全部选项   |          含义          |   关系类型    | 关系描述 |
| :-------------: | :---: | :------: | :----: | :----------: | :--------------------: | :-----------: | :------: |
|       os        |  top  |  string  |  NULL  | window,linux |      操作系统类型      |       M       |   NULL   |
|      bits       |  top  |   int    |  NULL  |    32,64     |      操作系统位数      |       M       |   NULL   |
|       cr3       | extra |   long   |  NULL  |     NULL     |     cr3寄存器的值      |       E       |   NULL   |
|       pid       |  top  |   int    |  NULL  |     NULL     |         进程id         | E,P(ppid-pid) |   NULL   |
|      ppid       |  top  |   int    |  NULL  |     NULL     |        父进程id        | E,P(ppid-pid) |   NULL   |
|    proc_name    |  top  |  string  |  NULL  |     NULL     |         进程名         |       E       |   NULL   |
|    timestamp    |  top  |   long   |  NULL  |     NULL     |      时间戳（秒）      |       E       |   NULL   |
|    exe_path     | extra |  string  |  NULL  |     NULL     |     可执行文件路径     |       E       |   NULL   |
| replay_percent  | extra |  float   |  NULL  |     NULL     |       重放百分比       |       E       |   NULL   |
| string_tainted  | extra | dict_key |  NULL  |     NULL     |     字符串污染事件     |       O       |   NULL   |
|      addr       | extra |   long   |  NULL  |     NULL     |        内存地址        |       E       |   NULL   |
|       pc        | extra |   long   |  NULL  |     NULL     |       程序计数器       |       E       |   NULL   |
| tainted_string  | extra |  string  |  NULL  |     NULL     |     被污染的字符串     |       E       |   NULL   |
|  tainted_bytes  | extra |   int    |  NULL  |     NULL     |     被污染的字节数     |       O       |   NULL   |
|   curr_instr    | extra |   long   |  NULL  |     NULL     |       当前指令数       |       E       |   NULL   |
|   tainted_ram   | extra |  string  |  NULL  |     NULL     | 传出网络的带污点的字节 |       O       |   NULL   |
|   num_labels    | extra |   int    |  NULL  |     NULL     |       污点标签数       |       O       |   NULL   |
|  label_string   | extra |  string  |  NULL  |     NULL     |     污点标签字符串     |       O       |   NULL   |
| tainted_out_net | extra | dict_key |  NULL  |     NULL     |  污点数据传出网络事件  |       O       |   NULL   |
|    local_ip     | extra |  string  |  NULL  |     NULL     |         本地ip         |       E       |   NULL   |
|   foreign_ip    | extra |  string  |  NULL  |     NULL     |         远程ip         |       E       |   NULL   |