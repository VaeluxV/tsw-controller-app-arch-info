import z from "zod";
import { useForm } from "react-hook-form";
import { useEffect, useId, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "../../utils/t";
import { ControlColor, controlColors } from "../../config/controlColors";

const ADD_BUTTON_CONTROL_FORM_ID = "add_button_control_form";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: z.output<typeof schema>) => void;
};

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, t("Name is required"))
    .regex(
      /^[A-Za-z0-9_]+$/,
      t("Name may only contain alphanumeric characters")
    ),
  color: z.enum(ControlColor, t("Invalid color")),
});

export type TAddButtonControlFormValues = z.output<typeof schema>;

export const AddButtonControlForm = ({ open, onClose, onSubmit }: Props) => {
  const localId = useId();
  const formId = `${ADD_BUTTON_CONTROL_FORM_ID}-${localId.replace(/[^a-z0-9_-]/gi, "-")}`;
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const { reset, register, formState, handleSubmit, setError } = useForm<
    z.input<typeof schema>,
    unknown,
    z.output<typeof schema>
  >({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: "",
      color: ControlColor.PURPLE,
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleValidForm = (values: z.output<typeof schema>) => {
    try {
      onSubmit(values);
      dialogRef.current?.close();
    } catch (err) {
      setError("root", { message: String(err) });
    }
  };

  useEffect(() => {
    if (dialogRef.current) {
      if (open && !dialogRef.current.open) {
        dialogRef.current.showModal();
      } else if (!open && dialogRef.current.open) {
        dialogRef.current.close();
      }
    }
  }, [open]);

  return (
    <dialog ref={dialogRef} className="modal" onClose={handleClose}>
      <div className="modal-box flex flex-col gap-2">
        <h3 className="text-lg font-bold">{t("Add button control")}</h3>
        <form id={formId} onSubmit={handleSubmit(handleValidForm)}>
          <fieldset className="fieldset w-full">
            <legend className="fieldset-legend">
              {t("Enter button name")}
            </legend>
            <input type="text" className="input w-full" {...register("name")} />
            {!!formState.errors.name && (
              <p className="label text-error">
                {formState.errors.name.message}
              </p>
            )}
          </fieldset>
          <fieldset className="fieldset w-full">
            <legend className="fieldset-legend">{t("Color")}</legend>
            <select className="select w-full" {...register("color")}>
              {controlColors.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
            {!!formState.errors.color && (
              <p className="label text-error">
                {formState.errors.color.message}
              </p>
            )}
          </fieldset>
          <div role="alert" className="alert">
            <span>
              {t(
                "Buttons will report a value of 0 or 1 depending on the pressed state"
              )}
            </span>
          </div>
        </form>
        <div className="modal-action">
          <form method="dialog">
            <button type="submit" className="btn btn-sm">
              {t("Cancel")}
            </button>
          </form>
          <button
            type="submit"
            form={formId}
            className="btn btn-sm btn-primary"
            disabled={!formState.isDirty || !formState.isValid}
          >
            {t("Add")}
          </button>
        </div>
        {!!formState.errors.root && (
          <div className="alert alert-error">
            {formState.errors.root.message}
          </div>
        )}
      </div>
    </dialog>
  );
};
