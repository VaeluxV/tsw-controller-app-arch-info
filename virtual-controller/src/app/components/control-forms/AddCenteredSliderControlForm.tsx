import z from "zod";
import { useForm } from "react-hook-form";
import { useEffect, useId, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "../../utils/t";
import { ControlColor, controlColors } from "../../config/controlColors";

const ADD_CENTERED_SLIDER_CONTROL_FORM_ID = "add_centered_slider_control_form";

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
  snap: z
    .literal("")
    .or(
      z.coerce.number().positive(t("Snap value should be positive")).nullish()
    ),
});

export type TAddCenteredSliderControlFormValues = z.output<typeof schema>;

export const AddCenteredSliderControlForm = ({
  open,
  onClose,
  onSubmit,
}: Props) => {
  const localId = useId();
  const formId = `${ADD_CENTERED_SLIDER_CONTROL_FORM_ID}-${localId.replace(/[^a-z0-9_-]/gi, "-")}`;
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const { reset, register, formState, watch, handleSubmit, setError } = useForm<
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
  console.log(watch("snap"));

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
        <h3 className="text-lg font-bold">{t("Add slider control")}</h3>
        <form id={formId} onSubmit={handleSubmit(handleValidForm)}>
          <fieldset className="fieldset w-full">
            <legend className="fieldset-legend">
              {t("Enter slider name")}
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
          <fieldset className="fieldset w-full">
            <legend className="fieldset-legend">{t("Snap value")}</legend>
            <input
              type="number"
              step={0.01}
              className="input w-full"
              {...register("snap")}
            />
            {!!formState.errors.snap && (
              <p className="label text-error">
                {formState.errors.snap.message}
              </p>
            )}
          </fieldset>
          <div role="alert" className="alert">
            <span>
              {t(
                "Centered sliders will report a value between -1 and 1 depending on the state"
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
