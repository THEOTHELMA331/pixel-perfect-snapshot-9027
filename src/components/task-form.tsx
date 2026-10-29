import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { setData, uid, useData } from "@/lib/store";
import type { Task } from "@/lib/types";

const empty = (): Task => ({
  id: "", title: "", description: "", dueDate: "", duration: 60, priority: "medium", category: "Work",
  status: "todo", preferredTime: "any", owner: "", dependsOn: [], createdAt: "",
});

export function TaskForm({ open, onOpenChange, task }: { open: boolean; onOpenChange: (o: boolean) => void; task?: Task | null }) {
  const { tasks } = useData();
  const [t, setT] = useState<Task>(empty());
  useEffect(() => { if (open) setT(task ? { ...task } : empty()); }, [open, task]);
  const set = <K extends keyof Task>(k: K, v: Task[K]) => setT((x) => ({ ...x, [k]: v }));

  function save() {
    if (!t.title.trim()) return toast.error("Task title is required.");
    if (!(t.duration > 0)) return toast.error("Estimated duration must be more than 0 minutes.");
    const clean: Task = { ...t, dueDate: t.dueDate || undefined, owner: t.owner?.trim() || undefined };
    setData((d) =>
      task
        ? { ...d, tasks: d.tasks.map((x) => (x.id === task.id ? { ...clean, completedAt: clean.status === "done" ? x.completedAt ?? new Date().toISOString() : undefined } : x)) }
        : { ...d, tasks: [{ ...clean, id: uid(), createdAt: new Date().toISOString(), completedAt: clean.status === "done" ? new Date().toISOString() : undefined }, ...d.tasks] },
    );
    toast.success(task ? "Task updated." : "Task added.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-auto">
        <DialogHeader><DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="tt">Task title</Label><Input id="tt" value={t.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="td">Description</Label><Textarea id="td" rows={3} value={t.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label htmlFor="tdue">Due date</Label><Input id="tdue" type="date" value={t.dueDate ?? ""} onChange={(e) => set("dueDate", e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="tdur">Duration (minutes)</Label><Input id="tdur" type="number" min={5} step={5} value={t.duration} onChange={(e) => set("duration", Number(e.target.value))} /></div>
            <div className="space-y-1.5"><Label>Priority</Label>
              <Select value={t.priority} onValueChange={(v) => set("priority", v as Task["priority"])}><SelectTrigger aria-label="Priority"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Status</Label>
              <Select value={t.status} onValueChange={(v) => set("status", v as Task["status"])}><SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todo">To do</SelectItem><SelectItem value="in_progress">In progress</SelectItem><SelectItem value="done">Done</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="tcat">Category</Label><Input id="tcat" value={t.category} onChange={(e) => set("category", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Preferred time</Label>
              <Select value={t.preferredTime} onValueChange={(v) => set("preferredTime", v as Task["preferredTime"])}><SelectTrigger aria-label="Preferred time"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="any">Any time</SelectItem><SelectItem value="morning">Morning</SelectItem><SelectItem value="afternoon">Afternoon</SelectItem><SelectItem value="evening">Evening</SelectItem></SelectContent></Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="town">Responsible person (optional)</Label><Input id="town" value={t.owner ?? ""} onChange={(e) => set("owner", e.target.value)} /></div>
          {tasks.filter((x) => x.id !== t.id).length > 0 && (
            <div className="space-y-1.5"><Label>Depends on (optional)</Label>
              <Select value={t.dependsOn?.[0] ?? "none"} onValueChange={(v) => set("dependsOn", v === "none" ? [] : [v])}>
                <SelectTrigger aria-label="Depends on"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">Nothing</SelectItem>{tasks.filter((x) => x.id !== t.id).map((x) => <SelectItem key={x.id} value={x.id}>{x.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {t.sourceMeetingTitle && <p className="text-xs text-muted-foreground">From meeting: {t.sourceMeetingTitle}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save}>Save task</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
