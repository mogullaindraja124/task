import json
from datetime import datetime,timedelta
task=[]
try:
        with open("t.json", "r") as file:
                task = json.load(file)
except FileNotFoundError:
        print("there are no tasks")
def generated_id():
        id_list=[]
        for t in task:
                if "id" in t:
                        id_list.append(t["id"])
        if not id_list:
                return 1
        return max(id_list)+1
def save_tasks():
        with open("t.json", "w") as file:
                json.dump(task,file)
def missing_id():
        for t in task:
                if "id" in t:
                        continue
                t["id"]=generated_id()
        save_tasks()
missing_id()
def priority():
        print("1.high\n2.medium\n3.low")
        while True:
                try:
                        choice=int(input("enter your priority :"))
                except ValueError:
                        print("please enter a number!")
                        continue
                if choice==1:
                        return "high"
                elif choice==2:
                        return "medium"
                elif choice==3:
                        return "low"
                else:
                        print("enter valid choice")
def get_date():
        while True:
                date=input("enter date in dd-mm-yyyy form:")
                try:
                        datetime.strptime(date,"%d-%m-%Y")
                        return date
                except ValueError:
                        print("invalid date!")
                        continue
def add_task():
        t={"id":generated_id(),"name":input("enter task name:"),
        "status":"pending",
        "priority":priority(),
        "due_date":get_date()
        }
        task.append(t)
        save_tasks()
        print("task added successfully")
def delete():
        if not task:
                print("no task is available")
        else:
                while True:
                        try:
                                task_id=int(input("enter task id to delete:"))
                                break
                        except ValueError:
                                print("enter valid id")
                                continue
                for i in range(len(task)):
                        if task[i]["id"]==task_id:
                                task.pop(i)
                                save_tasks()
                                print("task deleted successfully")
                                break
                else:
                        print("task not found")

def display(task):
        if not task:
                print("no task available")
        else:
                print("__tasks__")
                print("ID\t\ttask\t\tstatus\t\tpriority\t\tdue_date\t\tdeadline\n-----------------")
                for t in task:
                        print(f"{t['id']}\t\t{t['name']}\t\t{t['status']}\t\t{t['priority']}\t\t{t['due_date']}\t\t{deadline_status(t['due_date'])}")
def update():
        if not task:
                print("no task available")
        else:
                while True:
                        try:
                                task_id=int(input("enter task id to update:"))
                                break
                        except ValueError:
                                print("enter valid id")
                                continue
                for i in range(len(task)):
                        if task[i]["id"]==task_id:
                                while True:
                                        print("1.status\n2.priority\n3.due date\n4.Exit")
                                        try:
                                                choice=int(input("enter your choice:"))
                                        except ValueError:
                                                print("please enter a valid choice!")
                                                continue
                                        if choice==1:
                                                if task[i]["status"]=="pending":
                                                        task[i]["status"]="completed"
                                                        print("task updated to completed")
                                                else:
                                                        task[i]["status"]="pending"
                                                        print("task updated to pending")
                                                break
                                        elif choice==2:
                                                task[i]["priority"]=priority()
                                                print("priority updated successfully")
                                                break
                                        elif choice==3:
                                                task[i]["due_date"]=get_date()
                                                print("date updated successfully")
                                                break
                                        elif choice==4:
                                                print("nothing updated")
                                                break
                                        else:
                                                print("enter valid choice")
                                save_tasks()
                                break
                else:
                        print("task not found")
def deadline_status(due_date):
        due_date=datetime.strptime(due_date,"%d-%m-%Y").date()
        today=datetime.today().date()
        tomorrow=today+timedelta(days=1)
        if due_date==today:
                return "Today"
        elif due_date<today:
                return "Overdue"
        else:
                if due_date==tomorrow:
                        return "Tomorrow"
                else:
                        return "Upcoming"
def search_task():
        if not task:
                print("there is no task")
                return
        found=False
        task_name=input("enter task name:")
        task_name=task_name.lower()
        for t in task:
                original_task=t["name"].lower()
                if task_name in original_task:
                        print(f"task name:{t['name']}\nstatus:{t['status']}\npriority:{t['priority']}\nduedate:{t['due_date']}\ndeadline:{deadline_status(t['due_date'])}")
                        found=True
        if not found:
                print("task not found")
def priority_sort():
        if not task:
                print("there is no task")
        else:
                priority_order={"high":1,"medium":2,"low":3}
                sorted_tasks=sorted(task,key=lambda x:priority_order[x["priority"]])
                display(sorted_tasks)
def duedate_sort():
        if not task:
                print("there is no task")
        else:
                sorted_tasks=sorted(task,key=lambda x:datetime.strptime(x["due_date"],"%d-%m-%Y"))
                display(sorted_tasks)
def status():
        print("1.completed\n2.pending")
        while True:
                try:
                        choice=int(input("enter your choice either 1 or 2:"))
                except ValueError:
                        print("enter a number")
                        continue
                if choice==1:
                        return "completed"
                elif choice==2:
                        return "pending"
                else:
                        print("invalid choice")
def status_filtered():
        task_status=status()
        filtered_tasks=[]
        for t in task:
                if t["status"]==task_status:
                        filtered_tasks.append(t)
        if not filtered_tasks:
                print("there is no task with your chosen status")
        else:
                display(filtered_tasks)
def priority_filtered():
        task_priority=priority()
        filtered_tasks=[]
        for t in task:
                if t["priority"]==task_priority:
                        filtered_tasks.append(t)
        if not filtered_tasks:
                print("there is no task with your chosen priority")
        else:
                display(filtered_tasks)
def due_time_filtered():
        due_date=get_date()#to get overdue give yesterday date,to get today give today date,to get tomorrow give tomorrow date and to get upcoming give day after tomorrow date
        task_duetime=deadline_status(due_date)
        filtered_tasks=[]
        for t in task:
                if task_duetime==deadline_status(t["due_date"]):
                        filtered_tasks.append(t)
        if not filtered_tasks:
                print("there is no task with this due time")
        else:
                display(filtered_tasks)
def status_analysis():
        completed_count=0
        pending_count=0
        for task_status in task:
                if task_status["status"]=="completed":
                        completed_count+=1
                else:
                        pending_count+=1
        print("completed tasks:",completed_count)
        print("pending tasks:",pending_count)
def priority_analysis():
        high_count=0
        medium_count=0
        low_count=0
        for task_priority in task:
                if task_priority["priority"]=="high":
                        high_count+=1
                elif task_priority["priority"]=="medium":
                        medium_count+=1
                else:
                        low_count+=1
        print("high priority tasks:",high_count)
        print("medium priority tasks:",medium_count)
        print("low priority tasks:",low_count)
def deadline_analysis():
        today_count=0
        tomorrow_count=0
        overdue_count=0
        upcoming_count=0
        for deadline in task:
                deadline_time=deadline_status(deadline["due_date"])
                if deadline_time=="Today":
                        today_count+=1
                elif deadline_time=="Tomorrow":
                        tomorrow_count+=1
                elif deadline_time=="Overdue":
                        overdue_count+=1
                else:
                        upcoming_count+=1
        print("-----DEADLINE---")
        print("overdue:",overdue_count)
        print("today:",today_count)
        print("tomorrow:",tomorrow_count)
        print("upcoming:",upcoming_count)                 
def summary():
        if not task:
                print("total no.of tasks:",len(task))
        else:
                print("=====task summary===")
                print("total no.of tasks:",len(task))
                status_analysis()
                priority_analysis()
                deadline_analysis()
while True:
        print("__task management___")
        print("1.ADD TASK\n2.DELETE TASK\n3.DISPLAY TASKS\n4.EXIT\n5.UPDATE\n6.Search task\n7.SORT BY PRIORITY\n8.sort by due date\n9.filter by status\n10.filter by priority\n11.filter by due time\n12.summary")
        try:
                choice=int(input("enter your choice:"))
        except ValueError:
                print("please enter a number")
                continue
        if choice==1:
                add_task()
        elif choice==2:
                delete()
        elif choice==3:
                display(task)
        elif choice==4:
                print("Thank You")
                break
        elif choice==5:
                update()
        elif choice==6:
                search_task()
        elif choice==7:
                priority_sort()
        elif choice==8:
                duedate_sort()
        elif choice==9:
                status_filtered()
        elif choice==10:
                priority_filtered()
        elif choice==11:
                due_time_filtered()
        elif choice==12:
                summary()
        else:
                print("invalid choice")
