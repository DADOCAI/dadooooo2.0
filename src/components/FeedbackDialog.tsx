import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { toast } from "sonner@2.0.3";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({
  open,
  onOpenChange,
}: FeedbackDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // 模拟提交到后端
    // 你可以在这里添加真实的 API 调用
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: 替换为真实的 API 调用
      console.log("Feedback submitted:", formData);

      toast.success("感谢您的反馈！");

      // 重置表单
      setFormData({ name: "", email: "", message: "" });
      onOpenChange(false);
    } catch (error) {
      toast.error("提交失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white border-2 border-blue-500 rounded-none">
        <DialogHeader>
          <DialogTitle>反馈意见</DialogTitle>
          <DialogDescription>
            请告诉我们您的想法，帮助我们改进或提供些新产品的创作意见。
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 mt-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              placeholder="请输入您的姓名"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              required
              className="rounded-none border-gray-300 focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:outline-none bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="请输入您的邮箱"
              value={formData.email}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  email: e.target.value,
                })
              }
              required
              className="rounded-none border-gray-300 focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:outline-none bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">反馈内容</Label>
            <Textarea
              id="message"
              placeholder="请详细描述您的意见或建议..."
              value={formData.message}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  message: e.target.value,
                })
              }
              required
              rows={6}
              className="resize-none rounded-none border-gray-300 focus-visible:border-blue-500 focus-visible:ring-0 focus-visible:outline-none bg-white"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-none border-gray-300 hover:bg-gray-100"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-none bg-black hover:bg-gray-800 text-white"
            >
              {isSubmitting ? "提交中..." : "提交反馈"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}